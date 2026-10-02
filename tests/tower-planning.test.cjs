"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { fixture } = require("./helpers/fixture.cjs");
const { playTask } = require("./helpers/play-task.cjs");
const { session } = require("./helpers/session.cjs");
const plain = value => JSON.parse(JSON.stringify(value));

function mentalRunner(f, mode = "training", overrides = {}) {
  const task = f.C.Tasks.find(task => task.id === "tower-london");
  return f.runner(mode, "keyboard", task, { ...task.params, planningMode: "mental", trials: 3, ...overrides });
}

async function scriptedPlans(f, ctx, script) {
  let active = null, actions = [];
  f.env.onFrame = time => {
    const current = ctx.current;
    if (!current || current.done || time - current.startedAt < 208) return;
    if (active !== current) {
      active = current;
      actions = script(current, ctx.trials.length);
    }
    const action = actions.shift();
    if (action !== undefined) {
      if (typeof action === "function") action(current);
      else ctx.respond(action, ctx.input);
    }
  };
  return ctx.task.run(ctx);
}
const inputs = moves => moves.flatMap(move => [move.from - 1, move.to - 1]);

test("Tower validates complete plans, accepts alternate legal routes and reports the first illegal move", () => {
  const f = fixture(), T = f.C.Tower;
  for (const start of T.states) for (const goal of T.states) {
    const solution = T.solve(start, goal);
    if (!solution.distance) continue;
    const plan = solution.path.map(move => ({ from: move.from + 1, to: move.to + 1 }));
    const result = T.evaluatePlan(start, goal, plan, plan.length);
    assert.equal(result.solved, true);
    assert.equal(T.serialize(result.finalState), T.serialize(goal));
    assert.equal(result.firstInvalid, null);
    assert.equal(result.moves.length, solution.distance);
    const detour = T.neighbors(start)[0];
    const alternate = [{ from: detour.from + 1, to: detour.to + 1 },
      { from: detour.to + 1, to: detour.from + 1 }, ...plan];
    assert.equal(T.evaluatePlan(start, goal, alternate, alternate.length).solved, true);
  }
  const start = [[0, 1, 2], [], []], goal = [[0, 1], [], [2]];
  const result = T.evaluatePlan(start, goal, [{ from: 1, to: 3 }, { from: 1, to: 3 }, { from: 3, to: 2 }], 3);
  assert.equal(result.solved, false, "Reaching the goal before an illegal move is not a successful plan");
  assert.deepEqual(plain(result.firstInvalid), { index: 2, from: 1, to: 3, type: "illegal-destination" });
  assert.deepEqual(plain(result.finalState), goal);
  assert.equal(result.moves.length, 1);
  for (const [move, type] of [
    [{ from: 2, to: 1 }, "empty-source"], [{ from: 1, to: 1 }, "same-peg"],
    [{ from: 4, to: 1 }, "invalid-peg"], [{ from: 1.5, to: 1 }, "invalid-peg"]
  ]) assert.equal(T.evaluatePlan(start, goal, [move], 1).firstInvalid.type, type);
  assert.equal(T.evaluatePlan(start, goal, [{ from: 1, to: 2 }], 1).solved, false);
  assert.equal(T.evaluatePlan(start, start, [], 1).solved, false);
  assert.throws(() => T.evaluatePlan("unknown", goal, [], 1), /Unknown Tower/);
  assert.throws(() => T.evaluatePlan(start, goal, [{ from: 1, to: 3 }], 0), /move limit/);
});

test("mental plans stay frozen, allow editing, require explicit complete submission and respect the move cap", async () => {
  const f = fixture(), ctx = mentalRunner(f, "training", { startMoves: 2, minMoves: 2, maxMoves: 2, maxExtraMoves: 0 });
  await scriptedPlans(f, ctx, current => {
    const frozen = current.scene, path = current.trial.optimalPath, move = path[0];
    const unchanged = () => {
      assert.equal(current.scene, frozen);
      assert.equal(current.done, false);
    };
    return [
      "done", () => { unchanged(); assert.match(ctx.responseStatus.textContent, /at least one move/); },
      move.from - 1, "done", () => { unchanged(); assert.match(ctx.responseStatus.textContent, /pending move/); },
      "back", () => { unchanged(); assert.equal(current.responses.length, 0); },
      move.from - 1, move.from - 1, () => { unchanged(); assert.equal(current.responses.length, 0); },
      ...inputs(path), () => { unchanged(); assert.equal(current.responses.length, path.length); },
      move.from - 1, () => { unchanged(); assert.match(ctx.responseStatus.textContent, /Move limit reached/); },
      "back", () => { unchanged(); assert.equal(current.responses.length, path.length - 1); },
      ...inputs(path.slice(-1)), () => { unchanged(); assert.match(ctx.responseStatus.textContent, /2: /); }, "done"
    ];
  });
  assert.equal(ctx.trials.length, 3);
  assert.ok(ctx.trials.every(row => row.solved && row.submittedPlan && row.endReason === "solved"));
  for (const row of ctx.trials) {
    assert.deepEqual(plain(row.plannedMoves), plain(row.optimalPath.map(({ from, to }) => ({ from, to }))));
    assert.equal(row.pendingSourcePeg, null);
    assert.ok(row.planSubmissionLatencyMs > row.firstMoveLatencyMs);
    assert.equal(row.rtMs, row.planSubmissionLatencyMs);
    assert.equal(row.actualLegalMoves, row.optimalMoves);
  }
  assert.equal(ctx.responseStatus.textContent, "");
  assert.equal(ctx.responseStatus.style.bottom, "");
  await ctx.close();
});

test("mental input gives no legality hints and validates illegal or unsuccessful plans only on submission", async () => {
  const f = fixture(), ctx = mentalRunner(f, "training", { startMoves: 2, minMoves: 2, maxMoves: 2 });
  await scriptedPlans(f, ctx, current => {
    const state = current.trial.initialState, empty = state.findIndex(peg => !peg.length);
    const move = empty !== -1 ? { from: empty + 1, to: (empty + 1) % 3 + 1 } :
      { from: 1, to: 3 };
    return [...inputs([move]), () => {
      assert.equal(current.done, false);
      assert.equal(current.responses.length, 1);
      assert.match(ctx.responseStatus.textContent, /1: /);
      assert.doesNotMatch(ctx.responseStatus.textContent, /empty|full|illegal|correct/i);
    }, "done"];
  });
  for (const row of ctx.trials) {
    assert.equal(row.correct, false);
    assert.equal(row.endReason, "illegal-move");
    assert.equal(row.invalidAttempts.length, 1);
    assert.equal(row.actualLegalMoves, 0);
    assert.equal(row.firstMoveLatencyMs, null);
    assert.deepEqual(plain(row.finalState), plain(row.initialState));
  }
  await ctx.close();
  const unsolved = mentalRunner(f, "assessment", { startMoves: 2, minMoves: 2, maxMoves: 2 });
  await scriptedPlans(f, unsolved, current => [...inputs(current.trial.optimalPath.slice(0, 1)), "done"]);
  assert.ok(unsolved.trials.every(row => !row.solved && row.endReason === "not-solved" && row.actualLegalMoves === 1));
  await unsolved.close();
});

test("an unsubmitted plan cannot solve a mental trial, even when its draft reaches the goal", async () => {
  const f = fixture(), ctx = mentalRunner(f, "training", { responseMs: 5000 });
  let replays = 0;
  const show = ctx.show.bind(ctx);
  ctx.show = (scene, ms, panel) => { if (scene?.layers?.length === 3) replays++; return show(scene, ms, panel); };
  await scriptedPlans(f, ctx, current => inputs(current.trial.optimalPath));
  assert.equal(replays, 0);
  for (const row of ctx.trials) {
    assert.equal(row.solved, false);
    assert.equal(row.correct, false);
    assert.equal(row.endReason, "timeout");
    assert.equal(row.submittedPlan, false);
    assert.equal(row.rtMs, null);
    assert.equal(row.actualLegalMoves, 0);
    assert.equal(row.plannedMoves.length, row.optimalMoves);
  }
  assert.equal(ctx.task.score(f.C.Stats.exclude(ctx.trials)).accuracy, 0);
  await ctx.close();
});

test("successful mental plans replay the submitted route including legal detours, with reduced-motion support", async () => {
  for (const reduced of [false, true]) {
    const f = fixture(), ctx = mentalRunner(f, "training", { minMoves: 2, startMoves: 2, maxMoves: 2, maxExtraMoves: 2 });
    const matchMedia = f.env.matchMedia;
    f.env.matchMedia = query => query.includes("prefers-reduced-motion") ? { matches: reduced } : matchMedia(query);
    const boards = [], shownBoards = [], paint = ctx.paint.bind(ctx), show = ctx.show.bind(ctx);
    ctx.paint = (scene, ...rest) => {
      if (!ctx.current && scene?.layers?.length === 3) boards.push(scene.layers[2].scene);
      return paint(scene, ...rest);
    };
    ctx.show = (scene, ...rest) => {
      if (scene?.layers?.length === 3) shownBoards.push(scene.layers[2].scene);
      return show(scene, ...rest);
    };
    await scriptedPlans(f, ctx, current => {
      const detour = f.C.Tower.neighbors(current.trial.initialState)[0];
      return [...inputs([{ from: detour.from + 1, to: detour.to + 1 },
        { from: detour.to + 1, to: detour.from + 1 }, ...current.trial.optimalPath]), "done"];
    });
    assert.ok(ctx.trials.every(row => row.solved && row.actualLegalMoves === row.optimalMoves + 2 && row.excessMoves === 2));
    assert.equal(ctx.task.score(f.C.Stats.exclude(ctx.trials)).optimalSolutions, 0);
    assert.equal(ctx.task.score(f.C.Stats.exclude(ctx.trials)).meanExcessMoves, 2);
    assert.ok(boards.length > (reduced ? 0 : 100));
    assert.equal(shownBoards[0], shownBoards[2], "The reversible detour returns to the displayed start");
    assert.equal(shownBoards.length, ctx.trials.reduce((sum, row) => sum + row.actualLegalMoves + 2, 0));
    await ctx.close();
  }
});

test("mental warm-ups replay but measured assessments reveal no correctness and never adapt", async () => {
  const f = fixture(), ctx = mentalRunner(f, "assessment");
  let replayFrames = 0;
  const paint = ctx.paint.bind(ctx);
  ctx.paint = (scene, ...rest) => {
    if (!ctx.current && scene?.layers) replayFrames++;
    return paint(scene, ...rest);
  };
  await playTask(f, ctx, { practice: true });
  assert.equal(f.C.practiceCount(ctx.practiceTrials), 8);
  assert.ok(ctx.practiceTrials.every(row => row.correct && row.planningMode === "mental"));
  assert.ok(replayFrames > 0);
  replayFrames = 0; ctx.states.clear();
  await playTask(f, ctx);
  assert.equal(replayFrames, 0);
  assert.ok(ctx.trials.every(row => row.correct));
  for (const entry of ctx.states.values()) assert.equal(entry.state.updates, 0);
  await ctx.close();
});

test("mental mode separates progress, adaptive state and familiarity while visible mode preserves legacy setups", async () => {
  const f = fixture(), task = f.C.Tasks.find(task => task.id === "tower-london");
  const legacy = { ...task.params }; delete legacy.planningMode;
  f.C.Storage.setSettings({ taskParams: { [task.id]: legacy } });
  assert.equal(f.C.taskParams(task).planningMode, "visible");
  const old = session(f, { taskId: task.id, params: legacy, score: { accuracy: 1 }, practiceCount: 8 });
  const visible = { ...old, params: { ...task.params } }, mental = { ...old, params: { ...task.params, planningMode: "mental" } };
  assert.equal(f.C.seriesKey(task, old), f.C.seriesKey(task, visible));
  assert.notEqual(f.C.seriesKey(task, visible), f.C.seriesKey(task, mental));
  assert.equal(f.C.Routine.practiceKey(task, legacy), f.C.Routine.practiceKey(task, visible.params));
  assert.notEqual(f.C.Routine.practiceKey(task, visible.params), f.C.Routine.practiceKey(task, mental.params));
  f.C.Storage.appendSession(old, []);
  assert.equal(f.C.Routine.canSkipPractice(task, visible.params), true);
  assert.equal(f.C.Routine.canSkipPractice(task, mental.params), false);
  const config = { start: 2, min: 1, max: 6 }, saved = f.C.Adaptive.create("stepwise", { ...config, start: 5 });
  const key = f.C.Adaptive.key(task.id, f.C.device(), f.C.input, f.C.language, `${f.C.canonical(legacy)}|tower-distance`);
  f.C.Storage.setSettings({ staircases: { [key]: saved } });
  const visibleCtx = f.runner("training", "keyboard", task);
  assert.equal(visibleCtx.state("tower-distance", "stepwise", config).state.value, 5);
  const mentalCtx = mentalRunner(f);
  assert.equal(mentalCtx.state("tower-distance", "stepwise", config).state.value, 2);
  await visibleCtx.close(); await mentalCtx.close();
  const routine = f.C.Routine.start();
  routine.steps[0] = { ...routine.steps[0], taskId: task.id, params: legacy };
  f.C.Storage.setRoutine(routine);
  const restored = fixture({ data: f.storage.get("cortex.v1") });
  assert.equal(restored.C.Routine.next().step.params.planningMode, "visible");
  assert.equal(restored.C.parameterError(task, { ...task.params, planningMode: "unknown" }), "settings.invalidValue");
});

test("aborting during replay persists the submitted trial but interrupts the round and cleans up controls", async () => {
  const f = fixture(), ctx = mentalRunner(f);
  let aborted = false;
  const paint = ctx.paint.bind(ctx);
  ctx.paint = (scene, ...rest) => {
    if (!ctx.current && ctx.trials.length && scene?.layers && !aborted) {
      aborted = true;
      ctx.abort();
    }
    return paint(scene, ...rest);
  };
  f.C.active = ctx; ctx.mainStartTime = 0; ctx.mainStartedAt = f.C.iso();
  await assert.rejects(playTask(f, ctx), error => error.name === "AbortError");
  await f.C.UI.finish(ctx);
  const summary = f.C.Storage.getSessions()[0];
  assert.equal(summary.invalid, true);
  assert.equal(summary.completedMain, false);
  assert.equal(f.C.Storage.getTrials(summary.id).length, 1);
  assert.equal(f.C.Storage.getTrials(summary.id)[0].submittedPlan, true);
  assert.equal(ctx.responseStatus.textContent, "");
  assert.equal(ctx.controls.hidden, true);
  assert.equal(f.C.active, null);
});
