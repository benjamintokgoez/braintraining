"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { fixture } = require("./helpers/fixture.cjs");
const { playTask } = require("./helpers/play-task.cjs");
const { session } = require("./helpers/session.cjs");

const timedIds = fixture().C.Tasks.filter(task => task.kind !== "journal").map(task => task.id);
const conflictIds = ["stroop-squared", "flanker-squared", "simon-squared"];
const correctedProtocols = [...conflictIds, "mental-arithmetic", "pvt-b"];
const processingIds = ["symmetry-span", "operation-span"];

for (const id of timedIds) {
  test(`${id}: wrong answers and omissions follow the scoring and assessment contracts`, async () => {
    for (const mode of ["training", "assessment"]) for (const responseMode of ["wrong", "omit"]) {
      const f = fixture({ autoSpeech: true, seed: 21 }), C = f.C;
      const text = C.Draw.text.bind(C.Draw);
      C.Draw.text = (...args) => Object.assign(text(...args), { auditText: String(args[0]) });
      const task = C.Tasks.find(task => task.id === id), ctx = f.runner(mode, "keyboard", task);
      if (id === "dual-nback") assert.equal(await C.Audio.unlock("en", "letters"), true);
      let feedback = 0;
      const show = ctx.show.bind(ctx);
      ctx.show = (...args) => {
        if ([C.t("runner.correct"), C.t("runner.incorrect")].includes(args[0]?.auditText)) feedback++;
        return show(...args);
      };
      const extra = await playTask(f, ctx, { responseMode });
      const rows = C.Stats.exclude(ctx.trials), eligible = C.Stats.eligible(rows);
      const score = { ...task.score(rows, ctx.params), ...extra?.score };
      assert.ok(eligible.length > 0, `${mode}/${responseMode}: scored observations`);
      if (responseMode === "omit" && id === "dual-nback") {
        assert.equal(score.hits, 0);
        assert.ok(score.misses > 0);
        assert.equal(score.falseAlarms, 0);
      } else if (responseMode === "omit" && id === "stop-signal") {
        assert.ok(eligible.every(row => row.correct === row.stopTrial));
        assert.equal(score.goAccuracy, 0);
        assert.equal(score.stopAccuracy, 1);
      } else {
        assert.ok(eligible.every(row => !row.correct), `${mode}/${responseMode}: no accidental correct answer`);
      }
      if (mode === "assessment") {
        assert.equal(feedback, 0, "Main assessments never display correctness");
        for (const entry of ctx.states.values()) assert.equal(entry.state.updates, 0, "Assessments never adapt");
      }
      assert.equal(ctx.invalid, processingIds.includes(id), "Processing criteria invalidate failed complex spans only");
      for (const value of Object.values(score)) {
        assert.ok(value === null || typeof value === "string" || Number.isFinite(value), `${id}: finite or unavailable score`);
      }
      assert.deepEqual(f.errors, []);
      assert.deepEqual(f.warnings, []);
      await ctx.close();
    }
  });
}

for (const id of conflictIds) {
  test(`${id}: rapid responses cannot shorten a 90-second assessment block`, async () => {
    const f = fixture(), task = f.C.Tasks.find(task => task.id === id);
    const ctx = f.runner("assessment", "keyboard", task, { ...task.params, blocks: 1 });
    let start;
    const countdown = ctx.countdown.bind(ctx);
    ctx.countdown = async () => { await countdown(); start = f.C.now(); };
    await playTask(f, ctx, { latency: 16 });
    assert.ok(f.C.now() - start >= 90000, "The timer, not an item-bank limit, ends the block");
    assert.ok(f.C.now() - start <= 90032, "Only display-frame rounding may exceed the protocol");
    assert.ok(ctx.trials.length > 610);
    assert.equal(f.C.Stats.eligible(f.C.Stats.exclude(ctx.trials)).length, 0, "Anticipatory input stays excluded");
    await ctx.close();
  });
}

test("Stroop warm-up demonstrates every enabled word/ink rule within eight presentations", async () => {
  for (const blocks of [1, 2, 3, 4]) {
    const f = fixture(), task = f.C.Tasks.find(task => task.id === "stroop-squared");
    const ctx = f.runner("training", "keyboard", task, { ...task.params, blocks });
    await playTask(f, ctx, { practice: true });
    assert.equal(f.C.practiceCount(ctx.practiceTrials), 8);
    assert.deepEqual([...new Set(ctx.practiceTrials.map(row => row.rule))], blocks > 1 ? ["word", "ink"] : ["word"]);
    assert.ok(ctx.practiceTrials.every(row => row.correct));
    await ctx.close();
  }
});

function arithmeticModel(expression, language = "en") {
  const normalized = expression.replaceAll(language === "de" ? "." : ",", "").replace(/[()]/g, "");
  const percentage = /^(\d+)% \S+ (\d+)$/.exec(normalized);
  if (percentage) return { operands: [Number(percentage[2])], answer: Number(percentage[1]) * Number(percentage[2]) / 100 };
  const match = /^(\d+) ([+\u2212\u00d7\u00f7]) (\d+)(?: \+ (\d+))?$/.exec(normalized);
  assert.ok(match, `Recognized arithmetic expression: ${expression}`);
  const [, left, operator, right, next] = match, a = Number(left), b = Number(right);
  const value = operator === "+" ? a + b : operator === "\u2212" ? a - b : operator === "\u00d7" ? a * b : a / b;
  return { operands: [a, b, ...(next === undefined ? [] : [Number(next)])], answer: value + Number(next || 0) };
}

test("arithmetic expressions honor both operand bounds and independently calculated answers", async () => {
  for (const language of ["en", "de"]) for (const mode of ["training", "assessment"]) {
    for (const operations of ["add", "subtract", "multiply", "divide", "mixed"]) for (const [minOperand, maxOperand] of [[3, 9], [0, 2], [2, 2], [100, 100], [100, 1000]]) {
      const f = fixture({ seed: 32, language }), task = f.C.Tasks.find(task => task.id === "mental-arithmetic");
      const ctx = f.runner(mode, "keyboard", task, {
        ...task.params, operations, minOperand, maxOperand, operandCeiling: maxOperand, durationSeconds: 30
      });
      await playTask(f, ctx);
      for (const row of ctx.trials) {
        const model = arithmeticModel(row.expression, language);
        assert.ok(model.operands.every(value => value >= minOperand && value <= maxOperand),
          `${mode}/${operations}: ${row.expression} stays within ${minOperand}-${maxOperand}`);
        assert.ok(Math.abs(model.answer - row.answer) < 1e-6, "Generated answer matches the displayed problem");
        assert.ok(row.magnitude >= Math.max(2, minOperand) && row.magnitude <= maxOperand);
        assert.ok(!row.expression.includes("\u00f7 0"), "Division never uses a zero divisor");
        if (row.expression.includes("\u00f7") && Math.max(2, minOperand) <= Math.floor(row.magnitude / 2)) {
          assert.ok(model.operands[1] >= 2 && model.operands[0] / model.operands[1] >= 2,
            "Bounded division does not collapse into identity problems when nontrivial choices exist");
        }
      }
      await ctx.close();
    }
  }
});

function observeScenes(f) {
  const scene = f.C.Draw.scene.bind(f.C.Draw);
  f.C.Draw.scene = (...args) => {
    const start = f.draws.length, result = scene(...args);
    return Object.assign(result, { auditDraws: f.draws.slice(start) });
  };
}

test("Stroop, Flanker, Simon and antisaccade answers match the actual drawn stimuli in both languages", async () => {
  for (const language of ["en", "de"]) for (const id of [...conflictIds, "antisaccade"]) {
    const f = fixture({ language }), C = f.C;
    observeScenes(f);
    const task = C.Tasks.find(task => task.id === id), ctx = f.runner("training", "keyboard", task);
    const trial = ctx.trial.bind(ctx);
    ctx.trial = spec => {
      const text = spec.scene.auditDraws.find(draw => draw.method === "fillText");
      if (id === "stroop-squared") {
        const color = ["stim-red", "stim-green", "stim-blue", "stim-yellow"].findIndex(name => C.Draw.palette[name] === text.color);
        const expected = spec.meta.rule === "word" ? text.args[0] : C.t(`color.${color}`).toUpperCase();
        assert.equal(spec.panel.options[spec.answer].label.toUpperCase(), expected);
      } else if (id === "flanker-squared") {
        assert.equal(spec.panel.options[spec.answer].label, text.args[0][2]);
        assert.equal(text.args[0].length, 5);
      } else if (id === "simon-squared") {
        const circle = spec.scene.auditDraws.find(draw => draw.method === "arc");
        const color = circle.color === C.Draw.palette["stim-red"] ? 0 : 1;
        assert.equal(spec.answer, color);
        assert.deepEqual(Array.from(spec.panel.options, option => option.label), [C.t("color.0"), C.t("color.1")]);
        assert.equal(circle.args[0] > spec.scene.width / 2, spec.meta.congruent ? color === 1 : color === 0);
      } else {
        const cue = spec.phases[1].scene.auditDraws.find(draw =>
          draw.method === "fillRect" && draw.args[2] === 16 && draw.args[3] === 16);
        const target = spec.phases[2].scene.auditDraws.find(draw => draw.method === "fillText");
        assert.notEqual(cue.args[0] > spec.phases[1].scene.width / 2, target.args[1] > spec.phases[2].scene.width / 2,
          "The brief letter is drawn opposite the peripheral cue");
        assert.equal(spec.panel.options[spec.answer].label, target.args[0]);
      }
      return trial(spec);
    };
    await playTask(f, ctx, { practice: true });
    assert.equal(C.practiceCount(ctx.practiceTrials), 8);
    await ctx.close();
  }
});

test("UFOV vehicle and peripheral answers agree with their drawn identity and clockwise location", async () => {
  const f = fixture(), C = f.C;
  observeScenes(f);
  const task = C.Tasks.find(task => task.id === "ufov"), ctx = f.runner("training", "keyboard", task);
  const trial = ctx.trial.bind(ctx);
  ctx.trial = spec => {
    if (spec.meta?.subtest) {
      const scene = spec.phases[0].scene;
      const truck = scene.auditDraws.some(draw => draw.method === "fillRect" && draw.args[3] === 15);
      assert.equal(spec.answer, Number(truck));
      const square = scene.auditDraws.find(draw => draw.method === "strokeRect" && draw.args[2] === 12);
      if (spec.meta.subtest === "central") assert.equal(square, undefined);
      else {
        const angle = spec.meta.location * Math.PI / 4 - Math.PI / 2;
        assert.ok(Math.abs(square.args[0] + 6 - scene.width / 2 - Math.cos(angle) * 87 * 1.5) < 1e-6);
        assert.ok(Math.abs(square.args[1] + 6 - scene.height / 2 - Math.sin(angle) * 87) < 1e-6);
      }
    }
    return trial(spec);
  };
  await playTask(f, ctx, { practice: true });
  assert.ok(ctx.practiceTrials.every(row => row.correct));
  await ctx.close();
});

test("visual arrays compare the color at the probed location and never test gray distractors", async () => {
  for (const language of ["en", "de"]) {
    const f = fixture({ language }), C = f.C;
    observeScenes(f);
    const task = C.Tasks.find(task => task.id === "visual-arrays");
    const ctx = f.runner("assessment", "keyboard", task, { ...task.params, trials: 24 });
    const trial = ctx.trial.bind(ctx);
    let reusedColorChanges = 0, distractorTrials = 0;
    ctx.trial = spec => {
      const squares = spec.phases[0].scene.auditDraws.filter(draw =>
        draw.method === "fillRect" && draw.args[2] === 24 && draw.args[3] === 24);
      const gray = C.Draw.palette["stim-gray"], targets = squares.filter(draw => draw.color !== gray);
      assert.equal(targets.length, spec.meta.setSize);
      assert.equal(squares.length - targets.length, spec.meta.distractors ? 4 : 0);
      if (spec.meta.distractors) distractorTrials++;
      const probe = spec.scene.auditDraws.find(draw =>
        draw.method === "fillRect" && draw.args[2] === 24 && draw.args[3] === 24);
      const original = targets.find(draw => draw.args[0] === probe.args[0] && draw.args[1] === probe.args[1]);
      assert.ok(original, "The probe occupies a previously colored target location");
      const changed = original.color !== probe.color;
      assert.equal(spec.answer, Number(changed));
      assert.equal(spec.meta.changed, changed);
      if (changed && targets.some(draw => draw.color === probe.color)) reusedColorChanges++;
      return trial(spec);
    };
    await playTask(f, ctx, { practice: true });
    await playTask(f, ctx);
    assert.ok(distractorTrials > 0);
    assert.ok(reusedColorChanges > 0, "A color seen elsewhere is still a change at this location");
    assert.ok([...ctx.practiceTrials, ...ctx.trials].every(row => row.correct));
    await ctx.close();
  }
});

test("Corsi and digit span reverse the displayed sequence exactly when backward recall is selected", async () => {
  for (const id of ["corsi", "digit-span"]) for (const direction of ["forward", "backward"]) {
    const f = fixture({ seed: 21 }), task = f.C.Tasks.find(task => task.id === id);
    const ctx = f.runner("assessment", "keyboard", task, { ...task.params, maxLength: 5, direction });
    await playTask(f, ctx, { practice: true });
    await playTask(f, ctx);
    for (const row of [...ctx.practiceTrials, ...ctx.trials]) {
      const expected = Array.from(row.sequence);
      if (direction === "backward") expected.reverse();
      assert.deepEqual(Array.from(row.expected), expected);
      assert.deepEqual(Array.from(row.response), expected);
      assert.equal(row.correct, true);
    }
    await ctx.close();
  }
});

test("n-back target and lure flags follow exact n-step comparisons in every stream variant", async () => {
  for (const variant of ["dual", "position", "audio", "arithmetic"]) for (const n of [1, 2, 9]) {
    const f = fixture({ autoSpeech: true }), task = f.C.Tasks.find(task => task.id === "dual-nback");
    const ctx = f.runner("assessment", "keyboard", task, { ...task.params, variant, n, blocks: 1, operand: 9 });
    if (["dual", "audio"].includes(variant)) await f.C.Audio.unlock("en", "letters");
    await playTask(f, ctx);
    for (const row of ctx.trials) for (const stream of ["position", "audio"]) {
      const offset = stream === "position" && variant === "arithmetic" ? ctx.params.operand : 0;
      const target = row.index >= n && row[stream] === ctx.trials[row.index - n][stream] + offset;
      const lure = !target && [n - 1, n + 1].some(distance =>
        distance > 0 && row.index >= distance && row[stream] === ctx.trials[row.index - distance][stream] + offset);
      assert.equal(row[`${stream}Target`], target);
      assert.equal(row[`${stream}Lure`], lure);
    }
    assert.ok(f.C.Stats.eligible(ctx.trials).every(row => row.correct));
    await ctx.close();
  }
});

test("memory, learning and cue-based tasks derive their answers from the presented relationships", async () => {
  const ids = ["symmetry-span", "operation-span", "running-span", "sternberg", "paired-associates",
    "method-loci", "ax-cpt", "task-switching", "digit-symbol"];
  for (const language of ["en", "de"]) for (const id of ids) {
    const f = fixture({ language }), task = f.C.Tasks.find(task => task.id === id), ctx = f.runner("assessment", "keyboard", task);
    const trial = ctx.trial.bind(ctx);
    ctx.trial = spec => {
      const meta = spec.meta;
      if (id === "symmetry-span" && spec.noRecord) {
        const symmetric = Array.from(meta.pattern).every((value, index) => value === meta.pattern[Math.floor(index / 8) * 8 + 7 - index % 8]);
        assert.equal(spec.answer, symmetric ? 0 : 1);
      } else if (id === "operation-span" && spec.noRecord) {
        const [expression, proposed] = meta.expression.split(" = ");
        const value = Number(proposed.replaceAll(language === "de" ? "." : ",", ""));
        assert.equal(spec.answer, arithmeticModel(expression, language).answer === value ? 0 : 1);
      } else if (id === "sternberg") assert.equal(spec.answer, meta.memory.includes(meta.probe) ? 0 : 1);
      else if (id === "paired-associates") {
        assert.equal(spec.answer, meta.pairs.some(pair => pair[0] === meta.pair[0] && pair[1] === meta.pair[1]) ? 0 : 1);
        assert.ok(meta.pairs.some(pair => pair[0] === meta.pair[0]) && meta.pairs.some(pair => pair[1] === meta.pair[1]));
      } else if (id === "ax-cpt") assert.equal(spec.answer, meta.cue === "A" && meta.probe === "X" ? 0 : 1);
      else if (id === "task-switching") {
        assert.ok([1, 2, 3, 4, 6, 7, 8, 9].includes(meta.digit));
        assert.equal(spec.answer, meta.rule === "parity" ? meta.digit % 2 ? 0 : 1 : meta.digit < 5 ? 0 : 1);
      } else if (id === "digit-symbol") {
        const pairs = meta.mappingCode.split("|").map(pair => pair.split(":"));
        assert.equal(pairs.length, 9);
        assert.equal(new Set(pairs.map(pair => pair[1])).size, 9);
        assert.equal(pairs.find(pair => Number(pair[0]) === spec.answer)[1], meta.glyphId);
      }
      return trial(spec);
    };
    await playTask(f, ctx, { practice: true });
    for (const row of ctx.practiceTrials) {
      if (id === "running-span") assert.deepEqual(Array.from(row.expected), Array.from(row.stream).slice(-row.length));
      if (id === "operation-span" || id === "method-loci") {
        const sequence = row.letterSequence || row.words;
        assert.deepEqual(Array.from(row.expected), Array.from(sequence, value => row.choices.indexOf(value)));
      }
    }
    assert.ok(ctx.practiceTrials.every(row => row.correct));
    await ctx.close();
  }
});

test("arithmetic lowers and restores challenge without exceeding configured bounds", async () => {
  const f = fixture(), task = f.C.Tasks.find(task => task.id === "mental-arithmetic");
  const ctx = f.runner("training", "keyboard", task, {
    ...task.params, minOperand: 3, maxOperand: 6, operandCeiling: 9, durationSeconds: 30
  });
  await playTask(f, ctx, { responseMode: () => ctx.trials.length < 5 ? "wrong" : "correct" });
  assert.equal(ctx.trials[0].magnitude, 6);
  assert.equal(ctx.trials[5].magnitude, 5);
  assert.equal(ctx.trials.at(-1).magnitude, 9);
  assert.ok(ctx.trials.every(row => row.magnitude >= 3 && row.magnitude <= 9));
  await ctx.close();
});

test("PVT retains slow lapses but still excludes false starts and display artifacts", () => {
  const f = fixture(), task = f.C.Tasks.find(task => task.id === "pvt-b");
  const input = [190, 200, 210, 1500].map(rtMs => ({ correct: true, response: [0], rtMs, lapse: rtMs > 355 }));
  input.push({ correct: false, response: [], rtMs: null, lapse: true },
    { correct: true, response: [0], rtMs: 100, falseStart: true, lapse: false },
    { correct: true, response: [0], rtMs: 3000, lapse: true, forcedExclusion: true },
    { correct: false, response: [], rtMs: null, unscored: true, lapse: false });
  const rows = f.C.Stats.exclude(input), score = task.score(rows);
  assert.equal(rows[3].excluded, false, "A long genuine lapse is not an RT artifact");
  assert.equal(rows[6].excluded, true, "Forced exclusions remain excluded");
  assert.equal(score.lapses, 2);
  assert.equal(score.falseStarts, 1);
  assert.equal(score.meanRT, 525);
  assert.equal(score.accuracy, .8);
  const ordinary = f.C.Stats.exclude([190, 200, 210, 1500].map(rtMs => ({ rtMs, correct: true })));
  assert.equal(ordinary[3].excluded, true, "Other tasks retain the ordinary slow-RT filter");
});

test("a stop trial whose delayed cue was never displayed cannot change its staircase", async () => {
  const f = fixture(), task = f.C.Tasks.find(task => task.id === "stop-signal");
  const ctx = f.runner("training", "keyboard", task);
  const jumped = new WeakSet();
  f.env.onFrame = time => {
    const current = ctx.current;
    if (!current || current.done) return;
    if (current.trial.stopTrial && !jumped.has(current)) {
      jumped.add(current);
      f.setTime(current.startedAt + current.deadline + 16);
    } else if (!current.trial.stopTrial && time - current.startedAt >= 208) ctx.respond(current.trial.direction, ctx.input);
  };
  await task.run(ctx);
  const stops = ctx.trials.filter(row => row.stopTrial);
  assert.ok(stops.length > 0 && stops.every(row => row.forcedExclusion && row.actualSsdMs === undefined));
  assert.equal([...ctx.states.values()][0].state.updates, 0);
  assert.equal([...ctx.states.values()][0].state.value, task.params.ssdStartMs);
  await ctx.close();
});

test("corrected arithmetic, vigilance and conflict protocols stay separate from legacy rounds and warm-ups", async () => {
  for (const id of correctedProtocols) {
    const f = fixture(), task = f.C.Tasks.find(task => task.id === id);
    assert.equal(task.protocolVersion, 3);
    const old = session(f, { taskId: id, params: task.params, protocolVersion: 2, practiceCount: 8, score: { accuracy: 1 } });
    f.C.Storage.appendSession(old, []);
    const legacyPracticeKey = f.C.canonical({
      task: id, params: task.params, mode: "training", device: f.C.device(), input: f.C.input,
      language: task.languageDependent ? f.C.language : "neutral", protocol: 2
    });
    f.C.Storage.setSettings({ practiceReady: { [legacyPracticeKey]: f.C.iso() } });
    assert.equal(f.C.Routine.canSkipPractice(task, task.params), false, "Old protocol does not establish new familiarity");
    const ctx = f.runner("training", "keyboard", task);
    ctx.mainStartTime = 0; ctx.mainStartedAt = f.C.iso(); ctx.completedMain = true;
    ctx.trials.push({ stimulusOnset: 16, response: [], rtMs: null, correct: false, length: 2 });
    const saved = await f.C.UI.finish(ctx);
    assert.equal(saved.protocolVersion, 3);
    assert.notEqual(f.C.seriesKey(task, old), f.C.seriesKey(task, saved));
  }
});

test("the arithmetic training ceiling validates independently and old settings and daily plans remain usable", () => {
  const f = fixture(), task = f.C.Tasks.find(task => task.id === "mental-arithmetic");
  assert.equal(f.C.parameterError(task, { ...task.params, operandCeiling: task.params.maxOperand - 1 }), "settings.rangeError");
  assert.equal(f.C.parameterError(task, { ...task.params, operandCeiling: task.params.maxOperand }), null);
  const legacy = { ...task.params };
  delete legacy.operandCeiling;
  f.C.Storage.setSettings({ taskParams: { [task.id]: legacy } });
  assert.equal(f.C.taskParams(task).operandCeiling, 1000);
  const routine = f.C.Routine.start();
  routine.steps[0] = { ...routine.steps[0], taskId: task.id, params: legacy };
  f.C.Storage.setRoutine(routine);
  const restored = fixture({ data: f.storage.get("cortex.v1") });
  const next = restored.C.Routine.next();
  assert.equal(next.routine.id, routine.id);
  assert.equal(next.routine.date, routine.date);
  assert.equal(next.index, 0);
  assert.equal(next.step.params.operandCeiling, 1000);
  assert.equal(restored.C.parameterError(next.task, next.step.params), null);
});

test("new task protocols do not borrow legacy staircases, while unchanged protocols keep their state", async () => {
  for (const id of ["flanker-squared", "digit-span"]) {
    const f = fixture(), task = f.C.Tasks.find(task => task.id === id);
    const variant = id === "digit-span" ? "length" : "deadline", type = id === "digit-span" ? "stepwise" : "deadline";
    const config = id === "digit-span" ? { start: 2, min: 2, max: 12 } : { start: 1000, min: 300, max: 3000 };
    const saved = f.C.Adaptive.create(type, { ...config, start: id === "digit-span" ? 6 : 500 });
    const key = f.C.Adaptive.key(id, f.C.device(), f.C.input, f.C.language, `${f.C.canonical(task.params)}|${variant}`);
    f.C.Storage.setSettings({ staircases: { [key]: saved } });
    const ctx = f.runner("training", "keyboard", task), current = ctx.state(variant, type, config);
    assert.equal(current.state.value, task.protocolVersion === 2 ? saved.value : config.start);
    await ctx.close();
  }
});
