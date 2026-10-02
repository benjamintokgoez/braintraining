"use strict";

const { test, expect } = require("@playwright/test");
const { enableClock, open, playPhase, capture, noOverflow } = require("./helpers.cjs");

async function configure(page, testInfo, { itemSet = "objects", coaching = "guided", mode = "training",
  inputMethod = null, language = "en" } = {}) {
  await enableClock(page);
  const input = inputMethod || (testInfo.project.name === "desktop" ? "keyboard" : "touch");
  await page.evaluate(({ input, language, mode }) => {
    const C = window.Cortex;
    C.Storage.setSettings({ inputMethod: input, language, mode, warmupPolicy: "always" });
    C.UI.syncPreferences(); C.UI.render();
  }, { input, language, mode });
  await open(page, "task/method-loci");
  await page.locator("#task-settings").click();
  await page.locator('[name="itemSet"]').selectOption(itemSet);
  await page.locator('[name="coaching"]').selectOption(coaching);
  await page.locator('[name="trials"]').fill("2");
  await page.locator('[name="loci"]').fill("3");
  await page.locator('[name="maxLoci"]').fill("4");
  await page.locator('[name="studyMs"]').fill("1000");
  await page.locator('[name="recallMs"]').fill("5000");
  await page.locator("#settings-form button[type='submit']").click();
  await expect(page.locator("#loci-lesson")).toHaveAttribute("open", "");
  return input;
}

async function waitForStage(page, stage) {
  for (let step = 0; step < 120; step++) {
    if (await page.evaluate(stage => window.Cortex.active?.current?.trial.stage === stage, stage)) {
      await page.clock.runFor(250);
      return;
    }
    await page.clock.runFor(250);
  }
  throw new Error(`Memory-palace phase did not appear: ${stage}`);
}

async function respond(page, value) {
  const control = await page.evaluate(value => {
    const ctx = window.Cortex.active, current = ctx.current;
    const index = current.options.findIndex(option => option.value === value);
    if (index < 0) throw new Error(`Missing memory-palace control: ${value}`);
    return { input: ctx.input, index, key: current.options[index].key };
  }, value);
  if (control.input === "keyboard") await page.keyboard.press(control.key === "space" ? "Space" : control.key);
  else if (control.input === "mouse") await page.locator("#response-controls button").nth(control.index).click({ force: true });
  else await page.locator("#response-controls button").nth(control.index).tap({ force: true });
  await page.clock.runFor(16);
}

async function enterItem(page, value) {
  for (let pageTurn = 0; pageTurn < 10; pageTurn++) {
    const action = await page.evaluate(value => {
      const current = window.Cortex.active.current;
      return current.options.some(option => option.value === value) ? value : value < current.options[0].value ? "prev" : "next";
    }, value);
    await respond(page, action);
    if (action === value) return;
  }
  throw new Error(`Cannot reach catalogue item ${value}`);
}

async function reviewAndRecall(page) {
  await respond(page, "next");
  await respond(page, "ready");
  await waitForStage(page, "loci-recall");
}

async function assertControlsFit(page) {
  const geometry = await page.evaluate(() => {
    const status = document.getElementById("response-status").getBoundingClientRect();
    const controls = [...document.querySelectorAll("#response-controls button")].map(button => {
      const rect = button.getBoundingClientRect();
      return { width: rect.width, height: rect.height, top: rect.top, bottom: rect.bottom,
        left: rect.left, right: rect.right, label: button.getAttribute("aria-label") };
    });
    return { controls, statusTop: status.top, statusBottom: status.bottom, width: innerWidth, height: innerHeight };
  });
  expect(geometry.controls.every(control => control.width >= 44 && control.height >= 44 && control.label)).toBe(true);
  expect(geometry.controls.every(control => control.left >= 0 && control.right <= geometry.width + 1 &&
    control.top >= 60 && control.bottom <= geometry.height + 1)).toBe(true);
  expect(geometry.statusTop).toBeGreaterThanOrEqual(60);
  expect(geometry.statusBottom).toBeLessThan(Math.min(...geometry.controls.map(control => control.top)));
  await noOverflow(page);
}

test.beforeEach(async ({ page }) => {
  page.appErrors = [];
  page.on("pageerror", error => page.appErrors.push(error.message));
  page.on("console", message => { if (message.type() === "error") page.appErrors.push(message.text()); });
});
test.afterEach(async ({ page }) => { expect(page.appErrors).toEqual([]); });

for (const itemSet of ["objects", "people", "cards"]) {
  test(`${itemSet}: lesson, eight warm-ups, ordered main recall, descriptive study metrics and reload work end to end`, async ({ page }, testInfo) => {
    test.setTimeout(120000);
    const mode = testInfo.project.name === "mobile-safari" ? "assessment" : "training";
    const language = testInfo.project.name === "mobile-safari" ? "de" : "en";
    const coaching = itemSet === "people" ? "independent" : "guided";
    const input = await configure(page, testInfo, { itemSet, coaching, mode, language });
    await expect(page.locator("#app h1")).toContainText(language === "de" ? "Gedächtnispalast" : "Memory palace");
    await expect(page.locator("#loci-lesson")).toContainText(language === "de" ? "Deine Route" : "Review your route");
    await expect(page.locator("#loci-lesson")).toContainText(language === "de" ? "Strategie nicht prüfen" : "cannot verify");
    await page.locator("#start-practice").click();
    await waitForStage(page, "loci-study");
    await assertControlsFit(page);
    await capture(page, testInfo, `${itemSet}-study`);
    await reviewAndRecall(page);
    await expect(page.locator("#response-controls button")).toHaveCount(11);
    await assertControlsFit(page);
    await capture(page, testInfo, `${itemSet}-recall`);
    await playPhase(page, "practice");
    await expect(page.locator("#start-main")).toBeVisible();
    expect(await page.evaluate(() => window.Cortex.practiceCount(window.Cortex.active.practiceTrials))).toBe(8);
    await page.locator("#start-main").click();
    await waitForStage(page, "loci-study");
    expect(await page.evaluate(() => window.Cortex.active.current.trial.selfPaced)).toBe(mode === "training");
    if (mode === "assessment") {
      const controls = await page.evaluate(() => window.Cortex.active.current.options.map(option => option.value));
      expect(controls).toEqual(coaching === "guided" ? ["route"] : []);
    }
    await playPhase(page, "block");
    await expect(page.locator(".completion-card")).toBeVisible();
    const result = await page.evaluate(() => {
      const C = window.Cortex, summary = C.Storage.getSessions()[0];
      return { summary, rows: C.Storage.getTrials(summary.id).filter(row => row.phase === "main"),
        persisted: JSON.parse(localStorage.getItem("cortex.v1")).sessions[0].id === summary.id,
        active: Boolean(C.active) };
    });
    expect(result.summary.params.itemSet).toBe(itemSet);
    expect(result.summary.params.coaching).toBe(coaching);
    expect(result.summary.inputMethod).toBe(input);
    expect(result.summary.protocolVersion).toBe(3);
    expect(result.summary.stimulusSet).toBe(`loci-${itemSet}`);
    expect(result.summary.completedMain).toBe(true);
    expect(result.summary.invalid).toBe(false);
    expect(result.summary.invalidReasons).toEqual([]);
    expect(result.summary.score.partialCreditLoad).toBe(1);
    expect(result.summary.score.meanStudySeconds).toBeGreaterThan(0);
    expect(result.summary.score.studySecondsPerItem).toBeGreaterThan(0);
    expect(result.rows).toHaveLength(2);
    expect(result.rows.every(row => row.correct && row.recallSubmitted && row.studyMode === (mode === "training" ? "self-paced" : "fixed"))).toBe(true);
    expect(result.rows.every(row => row.choices.length === ({ objects: 32, people: 16, cards: 52 })[itemSet])).toBe(true);
    expect(result.persisted).toBe(true);
    expect(result.active).toBe(false);
    await page.reload();
    await expect(page.locator(".completion-card")).toBeVisible();
    expect(await page.evaluate(() => window.Cortex.Storage.getSessions()[0].params.itemSet)).toBe(itemSet);
  });
}

test("native settings explain the technique, validate familiar people and custom routes, and preserve saved choices", async ({ page }, testInfo) => {
  await configure(page, testInfo);
  await page.locator("#task-settings").click();
  await expect(page.locator('[name="publicFigures"]')).toBeHidden();
  await expect(page.locator('[name="customLoci"]')).toBeHidden();
  await page.locator('[name="itemSet"]').selectOption("people");
  await expect(page.locator('[name="publicFigures"]')).toBeVisible();
  await page.locator('[name="publicFigures"]').fill("Ada Lovelace\nada lovelace");
  await page.locator("#settings-form button[type='submit']").click();
  await expect(page.locator("#settings-error")).toContainText("unique people");
  const names = "Ada Lovelace\nMarie Curie\nWolfgang Amadeus Mozart\nWilliam Shakespeare";
  await page.locator('[name="publicFigures"]').fill(names);
  await page.locator('[name="route"]').selectOption("custom");
  await expect(page.locator('[name="customLoci"]')).toBeVisible();
  await page.locator('[name="customLoci"]').fill("Door\nDoor\nStairs\nBed");
  await page.locator("#settings-form button[type='submit']").click();
  await expect(page.locator("#settings-error")).toContainText("unique landmarks");
  await page.locator('[name="customLoci"]').fill("My front door\nKitchen sink\nBlue sofa\nGarden gate");
  await page.locator('[name="coaching"]').selectOption("independent");
  await page.locator("#settings-form button[type='submit']").click();
  await expect(page.locator("#loci-lesson")).toContainText("not a face/name-learning test");
  await page.locator("#loci-lesson details summary").click();
  await expect(page.locator(".loci-route li")).toHaveText(["My front door", "Kitchen sink", "Blue sofa", "Garden gate"]);
  await page.reload();
  await page.locator("#task-settings").click();
  await expect(page.locator('[name="publicFigures"]')).toHaveValue(names);
  await expect(page.locator('[name="coaching"]')).toHaveValue("independent");
  await expect(page.locator('[name="route"]')).toHaveValue("custom");
  await page.locator("#reset-params").click();
  await expect(page.locator('[name="itemSet"]')).toHaveValue("objects");
  await expect(page.locator('[name="publicFigures"]')).toBeHidden();
  await expect(page.locator('[name="customLoci"]')).toBeHidden();
  await expect(page.locator('[name="studyMs"]')).toHaveValue("10000");
  await page.locator("#settings-form button[type='submit']").click();
  await page.reload();
  expect(await page.evaluate(() => window.Cortex.taskParams(window.Cortex.Tasks.find(task => task.id === "method-loci")).itemSet)).toBe("objects");
});

test("self-paced study survives a long pause, gates readiness and supports native editing, skips and explicit recall submission", async ({ page }, testInfo) => {
  await configure(page, testInfo, { itemSet: "cards", inputMethod: testInfo.project.name === "desktop" ? "mouse" : "touch" });
  await page.locator("#start-practice").click();
  await waitForStage(page, "loci-study");
  await respond(page, "ready");
  await expect(page.locator("#response-status")).toContainText("Review every item");
  await respond(page, "route");
  expect(await page.evaluate(() => window.Cortex.active.current.scene.layers.length)).toBe(3);
  await respond(page, "route");
  await page.clock.runFor(30000);
  expect(await page.evaluate(() => window.Cortex.active.current.trial.studyIndex)).toBe(0);
  expect(await page.evaluate(() => window.Cortex.active.current.deadline)).toBeNull();
  await respond(page, "next");
  await respond(page, "prev");
  expect(await page.evaluate(() => window.Cortex.active.current.trial.studyIndex)).toBe(0);
  await respond(page, "ready");
  await waitForStage(page, "loci-recall");
  const expected = await page.evaluate(() => window.Cortex.active.current.trial.expected);
  await enterItem(page, expected[0]);
  await respond(page, "back");
  expect(await page.evaluate(() => window.Cortex.active.current.responses.length)).toBe(0);
  await enterItem(page, expected[0]);
  await respond(page, "skip");
  await expect(page.locator("#response-status")).toContainText("blank");
  expect(await page.evaluate(() => window.Cortex.active.current.done)).toBe(false);
  await respond(page, "back");
  await enterItem(page, expected[1]);
  expect(await page.evaluate(() => window.Cortex.active.current.done)).toBe(false);
  const positions = await page.locator("#response-controls button").evaluateAll(buttons => buttons.slice(-5).map(button => {
    const rect = button.getBoundingClientRect();
    return { label: button.getAttribute("aria-label"), x: rect.x, y: rect.y };
  }));
  for (let index = 0; index < 9; index++) await respond(page, "next");
  await expect(page.locator("#response-controls button")).toHaveCount(9);
  await expect(page.locator("#response-controls button").first()).toHaveAttribute("aria-label", "10 of clubs");
  const lastPositions = await page.locator("#response-controls button").evaluateAll(buttons => buttons.slice(-5).map(button => {
    const rect = button.getBoundingClientRect();
    return { label: button.getAttribute("aria-label"), x: rect.x, y: rect.y };
  }));
  expect(lastPositions).toEqual(positions);
  await capture(page, testInfo, "full-catalogue-last-page");
  await respond(page, "done");
  await page.clock.runFor(32);
  const row = await page.evaluate(() => window.Cortex.active.practiceTrials[0]);
  expect(row.correct).toBe(true);
  expect(row.recallSubmitted).toBe(true);
  expect(row.studyDurationMs).toBeGreaterThanOrEqual(30000);
  expect(row.routeHintsUsed).toBe(1);
  await page.locator("#abort").click({ force: true });
  await expect(page.locator(".completion-card")).toBeVisible();
  await expect(page.locator("#response-status")).toBeEmpty();
});

for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }]) {
  test(`${viewport.width}px screens keep study readable, recall controls usable and interruptions persistent`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await configure(page, testInfo, { itemSet: "people" });
    await page.locator("#start-practice").click();
    await waitForStage(page, "loci-study");
    await assertControlsFit(page);
    const captionSize = await page.evaluate(() => {
      const ctx = window.Cortex.active, { scene, panel } = ctx.current;
      const areaHeight = Math.min(ctx.stimulusHeight, panel.top - panel.statusHeight);
      const maxHeight = Math.max(20, areaHeight - Math.max(72, ctx.safeTop + 64) - 12);
      return (ctx.w > ctx.h && ctx.h < 500 ? 30 : 26) * Math.min(1, (ctx.w - 24) / scene.width, maxHeight / scene.height);
    });
    expect(captionSize).toBeGreaterThanOrEqual(14);
    await capture(page, testInfo, `people-study-${viewport.width}`);
    await respond(page, "route");
    await assertControlsFit(page);
    await reviewAndRecall(page);
    await assertControlsFit(page);
    await capture(page, testInfo, `people-recall-${viewport.width}`);
    await page.locator("#abort").click({ force: true });
    await expect(page.locator(".completion-card")).toBeVisible();
    const saved = await page.evaluate(() => {
      const C = window.Cortex, summary = C.Storage.getSessions()[0];
      return { summary, rows: C.Storage.getTrials(summary.id), controls: document.getElementById("response-controls").children.length };
    });
    expect(saved.summary.invalid).toBe(true);
    expect(saved.summary.completedMain).toBe(false);
    expect(saved.rows).toHaveLength(0);
    expect(saved.controls).toBe(0);
    await expect(page.locator("#response-status")).toBeEmpty();
  });
}
