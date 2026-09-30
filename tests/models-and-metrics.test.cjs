"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { fixture } = require("./helpers/fixture.cjs");
const { session } = require("./helpers/session.cjs");
const { playTask } = require("./helpers/play-task.cjs");
const plain = value => JSON.parse(JSON.stringify(value));
const file = value => ({ text: async () => JSON.stringify(value) });
const mod = (value, base) => ((value % base) + base) % base;

test("completed low-FPS training advances the routine but never enters score comparisons or assessment cooldowns", () => {
  for (const overrides of [
    { mode: "training", completedMain: true, invalid: true, invalidReasons: ["runner.refresh"] },
    { mode: "assessment", completedMain: true, invalid: true, invalidReasons: ["runner.refresh"] },
    { mode: "training", completedMain: true, invalid: true, invalidReasons: ["runner.refresh", "runner.focus"] },
    { mode: "training", completedMain: false, invalid: true, invalidReasons: ["runner.refresh"] },
    { mode: "training", practiceOnly: true, completedMain: true, invalid: true, invalidReasons: ["runner.refresh"] }
  ]) {
    const f = fixture(), routine = f.C.Routine.start(), next = f.C.Routine.next();
    const row = session(f, { taskId: next.task.id, params: next.step.params, routineId: routine.id, routineStep: 0, ...overrides });
    f.C.Storage.appendSession(row, [], { routine: f.C.Routine.withSession(row) });
    const expected = overrides.mode === "training" && overrides.completedMain && !overrides.practiceOnly && overrides.invalidReasons.length === 1;
    assert.equal(f.C.completedRound(row), Boolean(expected));
    assert.equal(f.C.Routine.next().index, expected ? 1 : 0);
    assert.equal(f.C.UI.cooldown(next.task.id), null);
    assert.ok(!f.C.UI.chart(next.task, row.mode, next.task.primaryMetric).includes("<svg"));
    assert.equal(f.C.onlyTimingWarning([]), false);
  }
});

test("all morning budgets have coherent, valid estimates across the complete daily rotation", () => {
  const f = fixture(), original = f.C.canonical(f.C.Storage.getSettings().taskParams);
  const seen = new Set();
  for (let day = 0; day < 36; day++) {
    f.setTime(day * 86400000);
    for (const budget of [10, 15, 20]) {
      const routine = f.C.Routine.build(budget);
      let total = 0;
      for (const step of routine.steps) {
        const task = f.C.Tasks.find(task => task.id === step.taskId);
        seen.add(task.id);
        assert.equal(f.C.parameterError(task, step.params), null);
        assert.equal(step.estimatedMinutes, f.C.Routine.estimateMinutes(task, step.params));
        total += step.estimatedMinutes;
      }
      assert.ok(total <= budget && total >= budget - 3, `${budget}-minute template estimates ${total}`);
    }
  }
  assert.equal(seen.size, 13);
  assert.equal(f.C.canonical(f.C.Storage.getSettings().taskParams), original);
});

test("warm-up and main reasoning items never repeat and commit together in one final write", async () => {
  for (const id of ["matrix-reasoning", "number-series"]) {
    const f = fixture(), task = f.C.Tasks.find(task => task.id === id);
    const ctx = f.runner("training", "keyboard", task, { ...task.params, trials: 10 });
    await playTask(f, ctx, { practice: true });
    const practice = [...ctx.itemHashes[id]];
    ctx.states.clear();
    const extra = await playTask(f, ctx);
    assert.equal(ctx.itemHashes[id].length, 18);
    assert.equal(new Set(ctx.itemHashes[id]).size, 18);
    assert.deepEqual(plain(ctx.itemHashes[id].slice(0, 8)), practice);
    assert.equal(f.C.Storage.getItemHashes(id).length, 0);
    ctx.mainStartTime = 0; ctx.mainStartedAt = f.C.iso(); ctx.completedMain = true; ctx.extra = extra;
    await f.C.UI.finish(ctx);
    assert.equal(f.writes, 1);
    assert.equal(f.C.Storage.getItemHashes(id).length, 18);
  }
});

test("comparison series separate protocol, orientation, setup, parameters and relevant language", () => {
  const f = fixture(), task = f.C.Tasks.find(task => task.id === "dual-nback"), original = session(f, { taskId: task.id });
  const key = f.C.seriesKey(task, original);
  for (const override of [
    { protocolVersion: 1 }, { viewport: { width: 390, height: 844 } },
    { deviceClass: "phone" }, { inputMethod: "touch" }, { language: "de" },
    { stimulusSet: "speech-words-en" }, { params: { ...task.params, n: 3 } }
  ]) assert.notEqual(f.C.seriesKey(task, { ...original, ...override }), key);
  assert.equal(f.C.seriesKey(task, { ...original, viewport: { width: 1280, height: 800 } }), key);
  const neutral = f.C.Tasks.find(task => task.id === "mental-rotation");
  assert.equal(f.C.seriesKey(neutral, original), f.C.seriesKey(neutral, { ...original, language: "de" }));
  assert.equal(f.C.layoutOrientation(null), "unknown");
});

test("rotation and Tower scenes stack in narrow portrait and keep their layers inside the frame", async () => {
  for (const [width, height, portrait] of [[320, 568, true], [390, 844, true], [844, 390, false], [1280, 800, false]]) {
    for (const id of ["mental-rotation", "tower-london"]) {
      const f = fixture({ width, height }), task = f.C.Tasks.find(task => task.id === id), ctx = f.runner("training", "keyboard", task);
      const scenes = [], trial = ctx.trial.bind(ctx);
      ctx.trial = spec => { scenes.push(spec.scene); return trial(spec); };
      await playTask(f, ctx, { practice: true });
      assert.equal(scenes.length, 8);
      for (const scene of scenes) {
        assert.equal(scene.width, portrait ? id === "mental-rotation" ? 350 : 340 : 700);
        for (const layer of scene.layers) {
          assert.ok(layer.x >= 0 && layer.y >= 0);
          assert.ok(layer.x + layer.width <= scene.width && layer.y + layer.height <= scene.height);
        }
        assert.equal(scene.layers[2].y > scene.layers[1].y, portrait);
      }
      await ctx.close();
    }
  }
});

test("response hit targets remain at least 44 physical pixels after viewport scaling", async () => {
  const f = fixture({ width: 390, height: 844, touch: true }), ctx = f.runner("training", "touch");
  const panel = ctx.prepareOptions(f.C.Draw.options(Array.from({ length: 16 }, (_, index) => String(index + 1))), "grid");
  ctx.syncControls(panel); ctx.layoutScale = .7; ctx.layoutControls();
  for (const button of ctx.controlButtons) {
    assert.ok(parseFloat(button.style.width) * ctx.layoutScale >= 44);
    assert.ok(parseFloat(button.style.height) * ctx.layoutScale >= 44);
  }
  await ctx.close();
});

test("number series replay every declared rule with unique choices at each difficulty", () => {
  const f = fixture(), used = new Set();
  const operations = (value, ops) => ops.reduce((value, op) => op.type === "add" ? value + op.operand : value * op.operand, value);
  for (let level = 1; level <= 5; level++) for (let iteration = 0; iteration < 40; iteration++) {
    const item = f.C.Generators.series(level, used), rules = item.rules, length = item.sequence.length + 1;
    let replay;
    if (rules.kind === "second-differences") {
      replay = Array.from({ length }, (_, index) => rules.initial + index * rules.initialDifference + index * (index - 1) / 2 * rules.secondDifference);
    } else if (rules.kind === "interleaved") {
      const values = rules.lanes.map(lane => lane.initial);
      replay = Array.from({ length }, (_, index) => {
        const lane = index % rules.lanes.length, value = values[lane];
        values[lane] = operations(value, rules.lanes[lane].operations);
        return value;
      });
    } else {
      replay = [rules.initial];
      while (replay.length < length) {
        const index = replay.length - 1;
        replay.push(rules.kind === "alphabet-offsets" ?
          mod(replay.at(-1) + rules.offsets[index % rules.offsets.length], 26) :
          operations(replay.at(-1), rules.phases[index % rules.phases.length]));
      }
      if (rules.kind === "alphabet-offsets") replay = replay.map(value => String.fromCharCode(65 + value));
    }
    assert.deepEqual(replay, [...plain(item.sequence), item.correctAnswer]);
    assert.equal(new Set(item.options).size, 6);
    assert.equal(item.options[item.answer], item.correctAnswer);
  }
  assert.equal(used.size, 200);
  for (const level of [0, 6, 1.5, NaN]) assert.throws(() => f.C.Generators.series(level), /Difficulty/);
  assert.throws(() => f.C.Generators.series(1, {}), /usedSet/);
});

test("matrix cells satisfy their declared row/column rules and offer one distinct correct choice", () => {
  const f = fixture(), used = new Set();
  const bit = (type, a, b) => type === "and" ? a & b : type === "xor" ? a ^ b : type === "subtract" ? a & ~b : a | b;
  for (let level = 1; level <= 5; level++) for (let iteration = 0; iteration < 30; iteration++) {
    const item = f.C.Generators.matrix(level, used);
    assert.equal(item.cells.length, 9);
    assert.equal(new Set(item.options.map(f.C.canonical)).size, 8);
    assert.equal(f.C.canonical(item.options[item.answer]), f.C.canonical(item.cells[8]));
    if (item.rules.kind === "attribute-progressions") {
      for (const rule of item.rules.attributes) for (let index = 0; index < 9; index++) {
        const row = Math.floor(index / 3), column = index % 3;
        const offset = rule.axis === "both" ? rule.origin + row * rule.stepDownColumn + column * rule.stepAcrossRow :
          rule.lineStarts[rule.axis === "row" ? row : column] + (rule.axis === "row" ? column : row) * rule.step;
        assert.equal(item.cells[index][rule.attribute], rule.minimum + mod(offset, rule.modulus));
      }
    } else {
      for (const rule of item.rules.regions) {
        const lines = rule.axis === "row" ? [[0,1,2],[3,4,5],[6,7,8]] :
          rule.axis === "column" ? [[0,3,6],[1,4,7],[2,5,8]] :
            [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8]];
        for (const [a, b, result] of lines) assert.equal(
          bit(rule.operator, item.cells[a].bits & rule.mask, item.cells[b].bits & rule.mask) & rule.mask,
          item.cells[result].bits & rule.mask);
      }
    }
  }
  assert.equal(used.size, 150);
  assert.throws(() => f.C.Generators.matrix(0), /Difficulty/);
});

test("the 24 proper cube rotations preserve connected chiral figures and pair answers", () => {
  const f = fixture(), R = f.C.Rotation;
  assert.equal(R.rotations.length, 24);
  for (const matrix of R.rotations) {
    const [[a,b,c],[d,e,g],[h,i,j]] = matrix;
    assert.equal(a * (e * j - g * i) - b * (d * j - g * h) + c * (d * i - e * h), 1);
    for (const row of matrix) assert.equal(row.reduce((sum, value) => sum + value * value, 0), 1);
  }
  for (let blocks = 4; blocks <= 10; blocks++) {
    const figure = R.generate(blocks);
    assert.equal(figure.cells.length, blocks);
    assert.equal(R.connected(figure.cells), true);
    assert.notEqual(R.canonical(figure.cells), R.canonical(R.reflect(figure.cells)));
    for (const matrix of R.rotations) assert.equal(R.canonical(R.rotate(figure.cells, matrix)), figure.canonical);
    for (const same of [true, false]) {
      const pair = R.generatePair({ blockCount: blocks, angleDeg: 120, same });
      assert.equal(R.canonical(pair.leftCells) === R.canonical(pair.rightCells), same);
      assert.equal(pair.answer, same ? 0 : 1);
    }
  }
  assert.throws(() => R.generate(3), /4 to 10/);
});

test("every Tower solution is legal, optimal, reversible and preserves all three balls", () => {
  const f = fixture(), T = f.C.Tower;
  for (const start of T.states) for (const goal of T.states) {
    const solution = T.solve(start, goal);
    assert.equal(solution.distance, T.distance(start, goal));
    assert.equal(solution.distance, T.distance(goal, start));
    let current = start;
    for (const step of solution.path) {
      const next = T.move(current, step.from, step.to);
      assert.ok(next);
      assert.deepEqual(plain(next.state.flat().sort()), [0,1,2]);
      next.state.forEach((peg, index) => assert.ok(peg.length <= T.capacities[index]));
      current = next.state;
    }
    assert.equal(T.serialize(current), T.serialize(goal));
  }
  assert.equal(T.move(T.states[0], 0, 0), null);
  assert.throws(() => T.solve("unknown", T.states[0]), /Unknown Tower/);
});

test("SSRT estimates have explicit guard reasons instead of zero or invalid numbers", () => {
  const f = fixture(), S = f.C.Stats;
  const go = Array.from({ length: 24 }, () => ({ stopTrial: false, response: [0], rtMs: 500, deadlineMs: 1000, correct: true }));
  const stop = Array.from({ length: 8 }, (_, index) => ({ stopTrial: true, response: index < 4 ? [0] : [],
    rtMs: index < 4 ? 300 : null, actualSsdMs: 200, correct: index >= 4 }));
  assert.equal(S.ssrt([...go, ...stop]).ssrt, 300);
  for (const [rows, reason] of [
    [[], "minGo"], [[...go, ...stop.slice(0, 3)], "minStop"],
    [[...go, ...stop.map(row => ({ ...row, response: [], rtMs: null }))], "stopRate"],
    [[...go, ...stop.map(row => ({ ...row, rtMs: row.rtMs === null ? null : 600 }))], "race"],
    [[...go, ...stop.map(row => ({ ...row, actualSsdMs: null }))], "ssd"],
    [[...go, ...stop.map(row => ({ ...row, actualSsdMs: 600 }))], "nonpositive"]
  ]) {
    const result = S.ssrt(rows);
    assert.equal(result.ssrt, null);
    assert.equal(result.ssrtReasonKey, `score.ssrtReason.${reason}`);
  }
  const missing = S.accuracy([{ correct: false, unscored: true }, { correct: true, falseStart: true }]);
  assert.equal(missing, null);
  const state = f.C.Adaptive.create("deadline", { start: 1000, min: 300, max: 3000 });
  assert.equal(f.C.Adaptive.update(state, { accuracy: null, fast: true }).value, 1000);
});

test("forecast calibration includes endpoints, ignores unresolved/void/conflict entries, and weights actual observations", () => {
  const f = fixture();
  const rows = [{ status: "resolved", probability: 0, outcome: 0 }, { status: "resolved", probability: 1, outcome: 1 },
    { status: "resolved", probability: .5, outcome: 1 }, { status: "open", probability: 0, outcome: null },
    { status: "void", probability: 1, outcome: 0 }, { status: "conflict", probability: 0, outcome: 1 }];
  const stats = f.C.Stats.forecasting(rows);
  assert.equal(stats.resolved, 3);
  assert.equal(stats.meanBrier, .25 / 3);
  assert.equal(stats.calibration[0].count, 1);
  assert.equal(stats.calibration.at(-1).count, 1);
  assert.equal(stats.calibration[1].meanProbability, null);
  assert.equal(f.C.Stats.forecasting([]).meanBrier, null);
  assert.throws(() => f.C.Stats.forecasting([], 1), /invalidBins/);
});

test("forecast immutability, resolution upgrades and conflicting outcomes survive idempotent restores", async () => {
  const f = fixture(), entry = f.C.Storage.createForecast({ claim: "Finish today's practice.", probability: .75,
    resolveBy: f.C.today(), language: "en" }).entry;
  const open = f.C.Storage.snapshot();
  f.C.Storage.resolveForecast(entry.id, 1);
  const resolved = f.C.Storage.snapshot(), restored = fixture({ data: open });
  assert.equal((await restored.C.Storage.importAll(file(resolved))).forecastsUpdated, 1);
  assert.equal((await restored.C.Storage.importAll(file(open))).forecastConflicts, 0);
  assert.equal(restored.C.Storage.getForecasts()[0].status, "resolved");
  const changed = plain(resolved); changed.forecasts[0].outcome = 0;
  assert.equal((await restored.C.Storage.importAll(file(changed))).forecastConflicts, 1);
  assert.equal((await restored.C.Storage.importAll(file(changed))).forecastConflicts, 0);
  const conflict = restored.C.Storage.getForecasts().find(row => row.status === "conflict");
  assert.equal(restored.C.Stats.forecasting(restored.C.Storage.getForecasts()).resolved, 1);
  restored.C.Storage.acceptForecastConflict(conflict.id);
  assert.equal(restored.C.Storage.getForecasts().find(row => row.id === entry.id).status, "void");
  assert.equal(restored.C.Stats.forecasting(restored.C.Storage.getForecasts()).meanBrier, .5625);
  assert.throws(() => restored.C.Storage.resolveForecast(conflict.id, 1), /invalidResolution/);
  const broken = restored.C.Storage.snapshot(); broken.forecasts[0].outcome = 1; broken.forecasts[0].resolvedAt = null;
  await assert.rejects(restored.C.Storage.importAll(file(broken)), /forecast.invalid/);
});

test("restoring the same conflicting session twice preserves one variant and one set of raw rows", async () => {
  const f = fixture(), original = session(f);
  f.C.Storage.appendSession(original, [{ index: 1 }]);
  const changed = f.C.Storage.snapshot(); changed.sessions[0].score.accuracy = .25;
  const first = await f.C.Storage.importAll(file(changed)), again = await f.C.Storage.importAll(file(changed));
  assert.equal(first.conflicts, 1);
  assert.equal(again.conflicts, 0);
  assert.equal(again.added, 0);
  assert.equal(f.C.Storage.getSessions().length, 2);
  const variant = f.C.Storage.getSessions().find(row => row.id !== original.id);
  assert.equal(variant.importSourceId, original.id);
  assert.equal(f.C.Storage.getTrials(variant.id).length, 1);
});

test("n-back familiarity needs an actual correct match response for every enabled stream", async () => {
  const f = fixture(), task = f.C.Tasks.find(task => task.id === "dual-nback");
  const ctx = f.runner("training", "keyboard", task, { ...task.params, variant: "position" });
  ctx.practiceTrials = Array.from({ length: 8 }, (_, index) => ({ stimulusOnset: index * 1000, rtMs: 300,
    correct: index >= 2, positionTarget: index < 2, response: [] }));
  f.C.Routine.recordPractice(ctx);
  assert.equal(f.C.Routine.canSkipPractice(task, ctx.params), false, "Correctly withholding cannot prove knowledge of the match control");
  ctx.practiceTrials[0].response = [0]; ctx.practiceTrials[0].correct = true;
  f.C.Routine.recordPractice(ctx);
  assert.equal(f.C.Routine.canSkipPractice(task, ctx.params), true);
  ctx.params.variant = "dual";
  ctx.practiceTrials[0].audioTarget = true;
  f.C.Routine.recordPractice(ctx);
  assert.equal(f.C.Routine.canSkipPractice(task, ctx.params), false);
  ctx.practiceTrials[0].response.push(1);
  f.C.Routine.recordPractice(ctx);
  assert.equal(f.C.Routine.canSkipPractice(task, ctx.params), true);
  await ctx.close();
});

test("English/German keys, placeholders, singular counts and all exercise guides stay synchronized", () => {
  const f = fixture(), dictionaries = f.env.CortexI18n.dictionaries;
  assert.deepEqual(Object.keys(dictionaries.en).sort(), Object.keys(dictionaries.de).sort());
  const placeholders = value => [...value.matchAll(/\{([^{}]+)\}/g)].map(match => match[1]).sort();
  for (const [key, value] of Object.entries(dictionaries.en)) {
    assert.ok(typeof value === "string" && value.length);
    assert.deepEqual(placeholders(value), placeholders(dictionaries.de[key]), key);
  }
  assert.equal(f.C.t("library.roundCount", { count: "1" }), "1 round");
  f.C.language = "de";
  assert.equal(f.C.t("library.roundCount", { count: f.C.number(1000) }), "1.000 Runden");
  for (const language of ["en", "de"]) {
    f.C.language = language;
    for (const task of f.C.Tasks) f.C.UI.instructions(task);
  }
  assert.deepEqual(f.warnings, []);
  assert.equal(f.C.csvCell(-.75), '"-0.75"');
  assert.equal(f.C.csvCell("-0.75"), '"\'-0.75"');
});
