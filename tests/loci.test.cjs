"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { fixture } = require("./helpers/fixture.cjs");
const { playTask } = require("./helpers/play-task.cjs");
const { session } = require("./helpers/session.cjs");
const plain = value => JSON.parse(JSON.stringify(value));

function palace(f, mode = "training", overrides = {}) {
  const task = f.C.Tasks.find(task => task.id === "method-loci");
  return f.runner(mode, "keyboard", task, { ...task.params, trials: 2, loci: 3, maxLoci: 4, studyMs: 1000, ...overrides });
}
function choose(ctx, current, value) {
  if (typeof value === "number" && !current.options.some(option => option.value === value)) {
    ctx.respond(value < current.options[0].value ? "prev" : "next", ctx.input);
    return false;
  }
  ctx.respond(value, ctx.input);
  return true;
}
function automaticStudy(ctx, current) {
  if (current.trial.selfPaced) ctx.respond(current.trial.studyIndex + 1 < current.trial.studyLength ? "next" : "ready", ctx.input);
}
async function scripted(f, ctx, action) {
  let frames = 0;
  f.env.onFrame = time => {
    if (++frames > 150000) throw new Error("Memory-palace script exceeded its frame budget");
    const current = ctx.current;
    if (current && !current.done && time - current.startedAt >= 208) action(current, time);
  };
  return ctx.task.run(ctx);
}

test("memory catalogues contain concrete objects, editable familiar people and all 52 distinct standard cards", () => {
  for (const language of ["en", "de"]) {
    const f = fixture({ language }), C = f.C, task = C.Tasks.find(task => task.id === "method-loci");
    for (const [itemSet, count] of [["objects", 32], ["people", 16], ["cards", 52]]) {
      const items = C.Loci.catalog({ ...task.params, itemSet });
      assert.equal(items.length, count);
      assert.equal(new Set(items.map(item => item.id)).size, count);
      assert.equal(new Set(items.map(item => item.label)).size, count);
      assert.ok(items.every(item => item.label && item.shortLabel && item.kind === itemSet));
      for (const item of items) {
        const start = f.draws.length;
        C.Loci.drawItem(item);
        const labels = f.draws.slice(start).filter(draw => draw.method === "fillText").map(draw => draw.args[0]);
        assert.ok(labels.includes(item.label), "The displayed item matches its stored label");
        if (itemSet === "objects") assert.ok(labels.includes(item.icon), "Every object has its own local illustration");
        if (itemSet === "cards") {
          assert.ok(labels.includes(item.rank) && labels.includes(item.suit.symbol));
          assert.equal(item.suit.color, ["H", "D"].includes(item.suit.id) ? "stim-red" : "task-fg");
        }
      }
    }
    assert.deepEqual(plain(C.Loci.catalog({ ...task.params, itemSet: "people", publicFigures: " Ada Lovelace\n\nMarie Curie " }))
      .map(item => item.label), ["Ada Lovelace", "Marie Curie"]);
    assert.throws(() => C.Loci.catalog({ ...task.params, itemSet: "unknown" }), /Unknown/);
  }
});

test("all material/coaching variants complete eight self-paced warm-ups and scored training or fixed assessment", async () => {
  for (const itemSet of ["objects", "people", "cards"]) for (const coaching of ["guided", "independent"]) {
    for (const mode of ["training", "assessment"]) {
      const f = fixture(), ctx = palace(f, mode, { itemSet, coaching });
      await playTask(f, ctx, { practice: true });
      assert.equal(f.C.practiceCount(ctx.practiceTrials), 8);
      assert.ok(ctx.practiceTrials.every(row => row.correct && row.studyMode === "self-paced" && row.recallSubmitted));
      assert.equal(ctx.trials.length, 0);
      ctx.states.clear();
      const extra = await playTask(f, ctx);
      assert.equal(extra.stimulusSet, `loci-${itemSet}`);
      assert.equal(ctx.trials.length, 2, "Study phases do not become scored trials");
      assert.ok(ctx.trials.every(row => row.correct && row.recallCorrect === row.length));
      for (const row of ctx.trials) {
        assert.equal(row.choices.length, f.C.Loci.catalog(ctx.params).length, "Recall includes the entire catalogue");
        assert.equal(row.itemSet, itemSet);
        assert.equal(row.coaching, coaching);
        assert.equal(row.routeHintsUsed, 0);
        assert.ok(row.studyOnsets.every(Number.isFinite));
        assert.ok(row.studyDurationMs > 0);
        if (mode === "assessment") {
          assert.equal(row.studyMode, "fixed");
          assert.ok(row.studyDurationMs >= row.length * ctx.params.studyMs);
          assert.ok(row.studyDurationMs <= row.length * (ctx.params.studyMs + 32));
        }
      }
      const score = ctx.task.score(f.C.Stats.exclude(ctx.trials));
      assert.equal(score.partialCreditLoad, 1);
      assert.equal(score.accuracy, 1);
      assert.ok(score.meanStudySeconds > 0 && score.studySecondsPerItem > 0);
      if (mode === "assessment") for (const entry of ctx.states.values()) assert.equal(entry.state.updates, 0);
      assert.deepEqual(f.errors, []);
      await ctx.close();
    }
  }
});

test("self-paced study cannot time out, requires viewing all items and allows revisiting with optional route cues", async () => {
  const f = fixture(), ctx = palace(f, "training", { loci: 2, maxLoci: 2 });
  const steps = new WeakMap();
  await scripted(f, ctx, (current, time) => {
    if (current.trial.stage === "loci-study") {
      const step = steps.get(current) || 0;
      if (step === 0) {
        assert.equal(current.deadline, null);
        assert.equal(current.scene.layers.length, 2, "No mandatory landmark cue");
        ctx.respond("ready", ctx.input);
        assert.equal(current.done, false);
        assert.match(ctx.responseStatus.textContent, /every item/);
        ctx.respond("route", ctx.input);
        assert.equal(current.scene.layers.length, 3);
        for (const layer of current.scene.layers) {
          assert.equal(layer.width, layer.scene.width);
          assert.equal(layer.height, layer.scene.height, "Study text is not stretched or squashed");
        }
        ctx.respond("route", ctx.input);
        assert.equal(current.scene.layers.length, 2);
        steps.set(current, 1);
      } else if (step === 1 && time - current.startedAt >= 30000) {
        assert.equal(current.done, false);
        ctx.respond("next", ctx.input);
        ctx.respond("prev", ctx.input);
        assert.equal(current.trial.studyIndex, 0, "Previously reviewed items remain revisitable");
        ctx.respond("ready", ctx.input);
        steps.set(current, 2);
      }
    } else {
      assert.equal(current.scene.layers, undefined, "Recall has no study item or landmark layer");
      const expected = current.trial.expected;
      choose(ctx, current, current.responses.length < expected.length ? expected[current.responses.length] : "done");
    }
  });
  assert.ok(ctx.trials.every(row => row.correct && row.studyDurationMs >= 30000 && row.routeHintsUsed === 1));
  await ctx.close();
});

test("full-catalogue recall preserves edits, blank positions and partial credit without automatic submission", async () => {
  const f = fixture({ width: 320, height: 568 }), ctx = palace(f, "assessment", { itemSet: "cards" });
  const stages = new WeakMap(), actionZones = new WeakMap();
  await scripted(f, ctx, current => {
    if (current.trial.stage === "loci-study") { automaticStudy(ctx, current); return; }
    const controls = current.zones.filter(zone => typeof zone.value === "string").map(({ value, x, y }) => ({ value, x, y }));
    if (!actionZones.has(current)) actionZones.set(current, plain(controls));
    else assert.deepEqual(plain(controls), actionZones.get(current), "Navigation actions do not move on the short last page");
    let step = stages.get(current) || 0;
    const expected = current.trial.expected;
    if (step === 0) {
      const wrong = current.options.find(option => typeof option.value === "number" && option.value !== expected[0]);
      ctx.respond(wrong.value, ctx.input);
      ctx.respond("back", ctx.input);
      assert.equal(current.responses.length, 0);
      step++;
    } else if (step === 1) {
      if (choose(ctx, current, expected[0])) step++;
    } else if (step === 2) {
      ctx.respond("skip", ctx.input);
      assert.equal(current.responses[1].value, null);
      assert.match(ctx.responseStatus.textContent, /blank/);
      step++;
    } else if (step === 3) {
      if (choose(ctx, current, expected[2])) step++;
    } else if (step === 4) {
      assert.equal(current.done, false);
      const firstOption = current.options.find(option => typeof option.value === "number");
      ctx.respond(firstOption.value, ctx.input);
      assert.equal(current.responses.length, 3);
      assert.match(ctx.responseStatus.textContent, /All positions entered/);
      ctx.respond("back", ctx.input);
      step++;
    } else if (step === 5) {
      if (choose(ctx, current, expected[2])) step++;
    } else if (step === 6) {
      for (let page = 0; page < 9; page++) ctx.respond("next", ctx.input);
      const lastPage = current.zones.filter(zone => typeof zone.value === "string").map(({ value, x, y }) => ({ value, x, y }));
      assert.deepEqual(plain(lastPage), actionZones.get(current));
      ctx.respond("done", ctx.input);
      step++;
    }
    stages.set(current, step);
  });
  assert.ok(ctx.trials.every(row => row.recallSubmitted && !row.correct && row.recallCorrect === 2));
  assert.ok(ctx.trials.every(row => row.response[1] === null && row.recalledItemIds[1] === null));
  const score = ctx.task.score(f.C.Stats.exclude(ctx.trials));
  assert.equal(ctx.trials[0].length, 3);
  assert.equal(ctx.trials[0].reliabilityValue, 2 / 3);
  assert.ok(score.partialCreditLoad > 0 && score.partialCreditLoad < 1);
  await ctx.close();
});

test("unsubmitted drafts and omissions time out without credit, while submitted partial recall earns positional credit", async () => {
  for (const responseMode of ["draft", "omit", "partial"]) {
    const f = fixture(), ctx = palace(f, "assessment", { recallMs: 5000 });
    await scripted(f, ctx, current => {
      if (current.trial.stage === "loci-study") return;
      const expected = current.trial.expected;
      if (responseMode === "omit") return;
      if (responseMode === "partial") choose(ctx, current, current.responses.length ? "done" : expected[0]);
      else if (current.responses.length < expected.length) choose(ctx, current, expected[current.responses.length]);
    });
    assert.ok(ctx.trials.every(row => !row.correct));
    assert.ok(ctx.trials.every(row => row.endReason === (responseMode === "partial" ? "submitted" : "timeout")));
    assert.ok(ctx.trials.every(row => row.recallCorrect === (responseMode === "partial" ? 1 : 0)));
    if (responseMode === "draft") assert.ok(ctx.trials.every(row => row.enteredCorrect === row.length && row.rtMs === null));
    await ctx.close();
  }
});

test("fixed assessments cannot advance study early, offer no independent-mode hints, reveal no correctness and never adapt", async () => {
  for (const coaching of ["guided", "independent"]) {
    const f = fixture(), ctx = palace(f, "assessment", { coaching });
    let feedback = 0;
    const show = ctx.show.bind(ctx);
    ctx.show = (scene, ...args) => {
      if (ctx.feedbackImages.includes(scene)) feedback++;
      return show(scene, ...args);
    };
    const seen = new WeakSet();
    await scripted(f, ctx, current => {
      if (current.trial.stage === "loci-study") {
        assert.equal(current.deadline, ctx.params.studyMs);
        assert.equal(current.trial.selfPaced, false);
        assert.ok(current.options.every(option => !["ready", "next", "prev"].includes(option.value)));
        if (coaching === "independent") {
          assert.equal(current.options.length, 0);
          assert.equal(current.scene.layers.length, 2);
        } else if (!seen.has(current)) {
          ctx.respond("route", ctx.input);
          assert.equal(current.done, false);
          assert.equal(current.scene.layers.length, 3);
          ctx.respond("route", ctx.input);
          seen.add(current);
        }
      } else {
        const expected = current.trial.expected;
        choose(ctx, current, current.responses.length < expected.length ? expected[current.responses.length] : "done");
      }
    });
    assert.equal(feedback, 0);
    assert.ok(ctx.trials.every(row => row.studyDurationMs >= row.length * ctx.params.studyMs));
    assert.ok(ctx.trials.every(row => row.routeHintsUsed === (coaching === "guided" ? row.length : 0)));
    for (const entry of ctx.states.values()) assert.equal(entry.state.updates, 0);
    await ctx.close();
  }
});

test("route and familiar-person validation reject duplicates, undersized lists and invalid settings explicitly", () => {
  const f = fixture(), task = f.C.Tasks.find(task => task.id === "method-loci"), q = task.params;
  for (const [patch, key] of [
    [{ loci: 9, maxLoci: 8 }, "loci.invalidRange"],
    [{ route: "custom", customLoci: "Door\nDoor" }, "loci.invalidRoute"],
    [{ route: "custom", customLoci: "Door\nHall" }, "loci.invalidRoute"],
    [{ route: "custom", loci: 2, maxLoci: 2, customLoci: "Caf\u00e9\nCafe\u0301" }, "loci.invalidRoute"],
    [{ route: "custom", loci: 2, maxLoci: 2, customLoci: `${"A".repeat(61)}\nHall` }, "loci.invalidRoute"],
    [{ itemSet: "people", publicFigures: "Ada Lovelace\nada lovelace" }, "loci.invalidPeople"],
    [{ itemSet: "people", publicFigures: "Ada Lovelace\nMarie Curie" }, "loci.invalidPeople"],
    [{ itemSet: "people", loci: 2, maxLoci: 2, publicFigures: "Ren\u00e9\nRene\u0301" }, "loci.invalidPeople"],
    [{ itemSet: "people", publicFigures: Array.from({ length: 33 }, (_, index) => `Person ${index}`).join("\n") }, "loci.invalidPeople"],
    [{ itemSet: "people", loci: 2, maxLoci: 2, publicFigures: `${"A".repeat(61)}\nMarie Curie` }, "loci.invalidPeople"],
    [{ itemSet: "unknown" }, "settings.invalidValue"],
    [{ coaching: "unknown" }, "settings.invalidValue"]
  ]) assert.equal(f.C.parameterError(task, { ...q, ...patch }), key);
  assert.equal(f.C.parameterError(task, { ...q, itemSet: "people", maxLoci: 2, loci: 2, publicFigures: "Ada Lovelace\nMarie Curie" }), null);
  const names = Array.from({ length: 32 }, (_, index) => `Person ${index}`).join("\n");
  assert.equal(f.C.parameterError(task, { ...q, itemSet: "people", publicFigures: names }), null);
  const longName = "Wolfgang Amadeus Mozart Famous Classical Austrian Composer";
  const start = f.draws.length;
  f.C.Loci.drawItem({ kind: "people", label: longName });
  const lines = f.draws.slice(start).filter(draw => draw.method === "fillText");
  assert.ok(lines.length > 1 && lines.length <= 3, "Long familiar names wrap instead of being flattened into a single line");
  assert.equal(lines.map(draw => draw.args[0]).join(" "), longName);
  assert.ok(lines.every(draw => draw.args[2] >= 140 && draw.args[2] <= 192));
});

test("protocol 3 preserves legacy records but does not reuse their scores, familiarity or adaptive state", async () => {
  const f = fixture(), task = f.C.Tasks.find(task => task.id === "method-loci");
  const legacy = { trials: 5, loci: 4, maxLoci: 8, route: "home", customLoci: "", studyMs: 2500, recallMs: 25000, distractorCount: 3 };
  const old = session(f, { taskId: task.id, params: legacy, protocolVersion: 2, score: { accuracy: 1, partialCreditLoad: 1 } });
  f.C.Storage.appendSession(old, [{ words: ["apple", "key"], response: [0, 1], correct: true }]);
  f.C.Storage.setSettings({ taskParams: { [task.id]: legacy } });
  const q = f.C.taskParams(task);
  assert.equal(q.itemSet, "objects"); assert.equal(q.coaching, "guided");
  assert.equal(q.studyMs, 2500);
  assert.equal(q.distractorCount, undefined);
  assert.equal(f.C.parameterError(task, q), null);
  assert.equal(f.C.Routine.canSkipPractice(task, q), false);
  assert.notEqual(f.C.seriesKey(task, old), f.C.seriesKey(task, { ...old, params: q, protocolVersion: 3 }));
  for (const patch of [{ itemSet: "cards" }, { coaching: "independent" }, { publicFigures: "New list" }]) {
    assert.notEqual(f.C.seriesKey(task, { ...old, params: q, protocolVersion: 3 }),
      f.C.seriesKey(task, { ...old, params: { ...q, ...patch }, protocolVersion: 3 }));
  }
  const config = { start: 4, min: 2, max: 8 }, saved = f.C.Adaptive.create("stepwise", { ...config, start: 7 });
  const key = f.C.Adaptive.key(task.id, f.C.device(), f.C.input, f.C.language, `${f.C.canonical(legacy)}|route-load`);
  f.C.Storage.setSettings({ staircases: { [key]: saved } });
  const ctx = f.runner("training", "keyboard", task, q);
  assert.equal(ctx.state("route-load", "stepwise", config).state.value, 4);
  await ctx.close();
  const routine = f.C.Routine.start();
  routine.steps[0] = { ...routine.steps[0], taskId: task.id, params: legacy };
  f.C.Storage.setRoutine(routine);
  const restored = fixture({ data: f.storage.get("cortex.v1") }), next = restored.C.Routine.next();
  assert.equal(next.step.params.itemSet, "objects");
  assert.equal(next.step.params.coaching, "guided");
  assert.equal(next.step.params.distractorCount, undefined);
  assert.equal(restored.C.parameterError(next.task, next.step.params), null);
  assert.equal(restored.C.Storage.getSessions()[0].protocolVersion, 2);
  assert.equal(restored.C.Storage.getTrials(old.id).length, 1);
  assert.equal(task.score([{ ...old, length: 2, recallCorrect: 2 }]).meanStudySeconds, null);
});

test("an interrupted self-paced study persists as incomplete, without fabricated recall rows or leaked controls", async () => {
  const f = fixture(), ctx = palace(f);
  f.C.active = ctx; ctx.mainStartTime = 0; ctx.mainStartedAt = f.C.iso();
  await assert.rejects(scripted(f, ctx, current => {
    if (current.trial.stage === "loci-study") ctx.abort();
  }), error => error.name === "AbortError");
  await f.C.UI.finish(ctx);
  const summary = f.C.Storage.getSessions()[0];
  assert.equal(summary.invalid, true);
  assert.equal(summary.completedMain, false);
  assert.equal(summary.score.meanStudySeconds, null);
  assert.equal(f.C.Storage.getTrials(summary.id).length, 0);
  assert.equal(ctx.controls.hidden, true);
  assert.equal(ctx.responseStatus.textContent, "");
  assert.equal(ctx.responseStatus.style.bottom, "");
  assert.equal(f.C.active, null);
});

test("self-paced runner phases are explicitly unrecorded and cannot silently replace timed scored trials", async () => {
  const f = fixture(), ctx = palace(f);
  for (const patch of [
    {}, { deadline: 1000 }, { fullDeadline: 1000 }, { waitFullWindow: true }, { multi: true },
    { visibleMs: 500 }, { counter: true }, { timeline: [{ atMs: 50 }] }
  ]) {
    const noRecord = Object.keys(patch).length > 0;
    await assert.rejects(ctx.trial({ selfPaced: true, noRecord, ...patch }), /Self-paced/);
  }
  await ctx.close();
});
