"use strict";

const { test, expect } = require("@playwright/test");
const { enableClock, open, playPhase, capture, noOverflow } = require("./helpers.cjs");

async function configure(page, testInfo, { mode = "training", language = "en", maxExtraMoves = 2,
  responseMs = 30000, inputMethod = null } = {}) {
  await enableClock(page);
  const input = inputMethod || (testInfo.project.name === "desktop" ? "keyboard" : "touch");
  await page.evaluate(({ input, language, mode }) => {
    const C = window.Cortex;
    C.Storage.setSettings({ inputMethod: input, language, mode, warmupPolicy: "always" });
    C.UI.syncPreferences(); C.UI.render();
  }, { input, language, mode });
  await open(page, "task/tower-london");
  await page.locator("#task-settings").click();
  await expect(page.locator('[name="planningMode"]')).toHaveValue("visible");
  await page.locator('[name="planningMode"]').selectOption("mental");
  await page.locator('[name="trials"]').fill("3");
  await page.locator('[name="maxExtraMoves"]').fill(String(maxExtraMoves));
  await page.locator('[name="responseMs"]').fill(String(responseMs));
  await page.locator("#settings-form button[type='submit']").click();
  await expect(page.locator("#app h1")).toContainText(language === "de" ? "Planen im Kopf" : "Mental planning");
  await noOverflow(page);
  return input;
}

async function waitForTrial(page) {
  for (let step = 0; step < 40; step++) {
    if (await page.evaluate(() => Boolean(window.Cortex.active?.current))) return;
    await page.clock.runFor(250);
  }
  throw new Error("Mental planning did not present a trial");
}

async function respond(page, value) {
  const control = await page.evaluate(value => {
    const ctx = window.Cortex.active;
    const index = ctx.current.options.findIndex(option => option.value === value);
    if (index === -1) throw new Error(`No control for ${value}`);
    return { input: ctx.input, index, key: ctx.current.options[index].key };
  }, value);
  if (control.input === "keyboard") await page.keyboard.press(control.key);
  else if (control.input === "mouse") await page.locator("#response-controls button").nth(control.index).click({ force: true });
  else await page.locator("#response-controls button").nth(control.index).tap({ force: true });
  await page.clock.runFor(16);
}

async function enterPlan(page, moves) {
  for (const move of moves) {
    await respond(page, move.from - 1);
    await respond(page, move.to - 1);
  }
}

async function observeReplay(page) {
  await page.evaluate(() => {
    window.towerReplays = [];
    const ctx = window.Cortex.active, show = ctx.show.bind(ctx);
    ctx.show = (scene, ...args) => {
      if (scene?.layers?.length === 3 && !ctx.current) window.towerReplays.push({
        phase: ctx.phase,
        current: scene.layers[2].scene.toDataURL(),
        goal: scene.layers[1].scene.toDataURL()
      });
      return show(scene, ...args);
    };
  });
}

test.beforeEach(async ({ page }) => {
  page.appErrors = [];
  page.on("pageerror", error => page.appErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") page.appErrors.push(message.text()); });
});
test.afterEach(async ({ page }) => { expect(page.appErrors).toEqual([]); });

test("native mental settings, eight warm-ups, replay, main scoring and saved results work end to end", async ({ page }, testInfo) => {
  test.setTimeout(120000);
  const assessment = testInfo.project.name === "mobile-safari", language = assessment ? "de" : "en";
  const input = await configure(page, testInfo, { mode: assessment ? "assessment" : "training", language });
  await page.reload();
  await expect(page.locator("#app h1")).toContainText(language === "de" ? "Planen im Kopf" : "Mental planning");
  await page.locator("#task-settings").click();
  await expect(page.locator('[name="planningMode"]')).toHaveValue("mental");
  await page.locator("#reset-params").click();
  await expect(page.locator('[name="planningMode"]')).toHaveValue("visible");
  await page.locator('[name="planningMode"]').selectOption("mental");
  await page.locator('[name="trials"]').fill("3");
  await page.locator("#settings-form button[type='submit']").click();
  await expect(page.locator(".guide")).toContainText(language === "de" ? "unverändert" : "frozen");
  await page.locator("#start-practice").click();
  await waitForTrial(page);
  await page.clock.runFor(250);
  await observeReplay(page);
  await expect(page.locator("#response-controls button")).toHaveCount(5);
  await expect(page.locator("#response-status")).toContainText("Plan:");
  const controls = await page.locator("#response-controls button").evaluateAll(buttons => buttons.map(button => {
    const rect = button.getBoundingClientRect();
    return { width: rect.width, height: rect.height, label: button.getAttribute("aria-label") };
  }));
  expect(controls.every(control => control.width >= 44 && control.height >= 44 && control.label)).toBe(true);
  await capture(page, testInfo, "mental-planning");
  await playPhase(page, "practice");
  await expect(page.locator("#start-main")).toBeVisible();
  const practice = await page.evaluate(() => ({
    count: window.Cortex.practiceCount(window.Cortex.active.practiceTrials),
    solved: window.Cortex.active.practiceTrials.every(row => row.solved && row.submittedPlan),
    replays: window.towerReplays.length,
    finishedAtGoal: window.towerReplays.at(-1).current === window.towerReplays.at(-1).goal
  }));
  expect(practice.count).toBe(8);
  expect(practice.solved).toBe(true);
  expect(practice.replays).toBeGreaterThan(0);
  expect(practice.finishedAtGoal).toBe(true);
  await page.evaluate(() => { window.towerReplays = []; });
  await page.locator("#start-main").click();
  await playPhase(page, "block");
  await expect(page.locator(".completion-card")).toBeVisible();
  const result = await page.evaluate(() => {
    const C = window.Cortex, summary = C.Storage.getSessions()[0], rows = C.Storage.getTrials(summary.id);
    return {
      summary, rows: rows.filter(row => row.phase === "main"),
      persisted: JSON.parse(localStorage.getItem("cortex.v1")).sessions[0].id === summary.id,
      replays: window.towerReplays.length
    };
  });
  expect(result.summary.params.planningMode).toBe("mental");
  expect(result.summary.inputMethod).toBe(input);
  expect(result.summary.completedMain).toBe(true);
  expect(result.summary.invalidReasons).toEqual([]);
  expect(result.summary.invalid).toBe(false);
  expect(result.summary.score.accuracy).toBe(1);
  expect(result.rows).toHaveLength(3);
  expect(result.rows.every(row => row.solved && row.submittedPlan && row.planningMode === "mental")).toBe(true);
  expect(result.persisted).toBe(true);
  expect(result.replays === 0).toBe(assessment);
  await page.reload();
  await expect(page.locator(".completion-card")).toBeVisible();
  await expect(page.locator(".completion-hero")).toContainText(language === "de" ? "Planen im Kopf" : "Mental planning");
});

test("native editing keeps the board frozen, does not leak legality and submits only explicitly", async ({ page }, testInfo) => {
  await configure(page, testInfo, { maxExtraMoves: 0,
    inputMethod: testInfo.project.name === "desktop" ? "mouse" : "touch" });
  await page.locator("#start-practice").click();
  await waitForTrial(page);
  await page.clock.runFor(250);
  const initial = await page.evaluate(() => ({
    image: document.getElementById("stage").toDataURL(),
    state: window.Cortex.active.current.trial.initialState,
    path: window.Cortex.active.current.trial.optimalPath
  }));
  expect(initial.path).toHaveLength(1);
  await respond(page, "done");
  await expect(page.locator("#response-status")).toContainText("at least one move");
  await respond(page, initial.path[0].from - 1);
  await respond(page, "done");
  await expect(page.locator("#response-status")).toContainText("pending move");
  await respond(page, "back");
  await enterPlan(page, initial.path);
  expect(await page.evaluate(() => window.Cortex.active.current.done)).toBe(false);
  await respond(page, 0);
  await expect(page.locator("#response-status")).toContainText("Move limit reached");
  expect(await page.evaluate(() => document.getElementById("stage").toDataURL())).toBe(initial.image);
  await respond(page, "back");
  expect(await page.evaluate(() => window.Cortex.active.current.responses.length)).toBe(0);
  const empty = initial.state.findIndex(peg => !peg.length);
  const illegal = empty !== -1 ? { from: empty + 1, to: (empty + 1) % 3 + 1 } : { from: 1, to: 3 };
  await enterPlan(page, [illegal]);
  await expect(page.locator("#response-status")).toContainText(`${illegal.from} → ${illegal.to}`);
  await expect(page.locator("#response-status")).not.toContainText(/empty|full|illegal|correct/i);
  expect(await page.evaluate(() => document.getElementById("stage").toDataURL())).toBe(initial.image);
  await respond(page, "done");
  const failed = await page.evaluate(() => window.Cortex.active.practiceTrials[0]);
  expect(failed.endReason).toBe("illegal-move");
  expect(failed.submittedPlan).toBe(true);
  expect(failed.invalidAttempts).toHaveLength(1);
  expect(failed.finalState).toEqual(initial.state);
  await expect(page.locator("#response-status")).toContainText(/Move 1: peg [123] is (empty|full)/);
  await capture(page, testInfo, "mental-illegal-feedback");
  await page.clock.runFor(1900);
  await waitForTrial(page);
  await page.clock.runFor(250);
  const path = await page.evaluate(() => window.Cortex.active.current.trial.optimalPath);
  await observeReplay(page);
  await enterPlan(page, path);
  await respond(page, "done");
  await page.clock.runFor(100);
  expect(await page.evaluate(() => window.Cortex.active.current)).toBeNull();
  expect(await page.evaluate(() => window.Cortex.active.practiceTrials[1].solved)).toBe(true);
  await page.clock.runFor(1800);
  expect(await page.evaluate(() => window.towerReplays.at(-1).current === window.towerReplays.at(-1).goal)).toBe(true);
  await page.locator("#abort").click({ force: true });
  await expect(page.locator(".completion-card")).toBeVisible();
  await expect(page.locator("#response-status")).toBeEmpty();
});

test("unsubmitted plans time out, reduced-motion replays are interruptible and small-screen controls fit", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await configure(page, testInfo, { responseMs: 5000 });
  await page.locator("#start-practice").click();
  await waitForTrial(page);
  await page.clock.runFor(250);
  const path = await page.evaluate(() => window.Cortex.active.current.trial.optimalPath);
  await enterPlan(page, path);
  await page.clock.runFor(5000);
  const timeout = await page.evaluate(() => window.Cortex.active.practiceTrials[0]);
  expect(timeout.endReason).toBe("timeout");
  expect(timeout.submittedPlan).toBe(false);
  expect(timeout.solved).toBe(false);
  expect(timeout.plannedMoves).toHaveLength(path.length);
  await page.clock.runFor(1900);
  await waitForTrial(page);
  await page.clock.runFor(250);
  const nextPath = await page.evaluate(() => window.Cortex.active.current.trial.optimalPath);
  await observeReplay(page);
  await enterPlan(page, nextPath);
  await respond(page, "done");
  await page.clock.runFor(400);
  expect(await page.evaluate(() => window.Cortex.active.current)).toBeNull();
  const replay = await page.evaluate(() => window.towerReplays);
  expect(replay).toHaveLength(2);
  expect(replay[0].current).not.toBe(replay[1].current);
  await capture(page, testInfo, "mental-reduced-motion-replay-320");
  await page.locator("#abort").click({ force: true });
  await expect(page.locator(".completion-card")).toBeVisible();
  const result = await page.evaluate(() => {
    const C = window.Cortex, summary = C.Storage.getSessions()[0];
    return { summary, rows: C.Storage.getTrials(summary.id), active: Boolean(C.active),
      controls: document.getElementById("response-controls").children.length };
  });
  expect(result.summary.invalid).toBe(true);
  expect(result.summary.completedMain).toBe(false);
  expect(result.rows).toHaveLength(2);
  expect(result.rows[1].solved).toBe(true);
  expect(result.controls).toBe(0);
  expect(result.active).toBe(false);
  await noOverflow(page);
});

test("long plans remain reviewable and successful detours replay in the entered order", async ({ page }, testInfo) => {
  await configure(page, testInfo, { maxExtraMoves: 10 });
  await page.locator("#start-practice").click();
  for (let index = 0; index < 4; index++) {
    await waitForTrial(page);
    await page.clock.runFor(250);
    const moves = await page.evaluate(() => window.Cortex.active.current.trial.optimalPath);
    await enterPlan(page, moves);
    await respond(page, "done");
    await page.clock.runFor(2500);
  }
  await waitForTrial(page);
  await page.clock.runFor(250);
  const plan = await page.evaluate(() => {
    const C = window.Cortex, trial = C.active.current.trial;
    const move = C.Tower.neighbors(trial.initialState)[0];
    return [...Array.from({ length: 5 }, () => [
      { from: move.from + 1, to: move.to + 1 }, { from: move.to + 1, to: move.from + 1 }
    ]).flat(), ...trial.optimalPath.map(({ from, to }) => ({ from, to }))];
  });
  await observeReplay(page);
  await enterPlan(page, plan);
  await expect(page.locator("#response-status")).toContainText("13: ");
  const layout = await page.evaluate(() => {
    const status = document.getElementById("response-status"), controls = document.getElementById("response-controls");
    const first = controls.children[0].getBoundingClientRect(), last = controls.children[4].getBoundingClientRect();
    return {
      statusBottom: status.getBoundingClientRect().bottom, controlsTop: first.top,
      statusHeight: status.clientHeight, scrollHeight: status.scrollHeight,
      lastRight: last.right, lastBottom: last.bottom, width: innerWidth, height: innerHeight
    };
  });
  expect(layout.statusBottom).toBeLessThan(layout.controlsTop);
  expect(layout.lastRight).toBeLessThanOrEqual(layout.width);
  expect(layout.lastBottom).toBeLessThanOrEqual(layout.height);
  await expect(page.locator("#response-status")).toHaveCSS("overflow-y", "auto");
  if (layout.scrollHeight > layout.statusHeight) {
    expect(await page.locator("#response-status").evaluate(status => status.scrollTop)).toBeGreaterThan(0);
    await page.locator("#response-status").evaluate(status => { status.scrollTop = 0; });
    expect(await page.locator("#response-status").evaluate(status => status.scrollTop)).toBe(0);
  }
  await capture(page, testInfo, "mental-long-plan");
  await respond(page, "done");
  await page.clock.runFor(10000);
  const result = await page.evaluate(() => {
    const ctx = window.Cortex.active, replay = window.towerReplays, row = ctx.practiceTrials[4];
    return {
      row,
      starts: replay.map(frame => frame.current),
      atGoal: replay.at(-1).current === replay.at(-1).goal
    };
  });
  expect(result.row.solved).toBe(true);
  expect(result.row.actualLegalMoves).toBe(13);
  expect(result.row.excessMoves).toBe(10);
  expect(result.row.plannedMoves).toEqual(plan);
  expect(result.starts).toHaveLength(15);
  expect(result.starts[0]).toBe(result.starts[2]);
  expect(result.starts[0]).toBe(result.starts[10]);
  expect(result.atGoal).toBe(true);
  await page.locator("#abort").click({ force: true });
  await expect(page.locator(".completion-card")).toBeVisible();
});
