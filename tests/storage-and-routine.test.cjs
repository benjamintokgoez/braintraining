"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { fixture } = require("./helpers/fixture.cjs");
const { session } = require("./helpers/session.cjs");
const plain = value => JSON.parse(JSON.stringify(value));
const file = value => ({ text: async () => JSON.stringify(value) });

test("legacy v1 backups retain their sessions and acquire optional preference defaults", () => {
  const original = fixture(), root = original.C.Storage.snapshot(), old = session(original);
  delete root.routine;
  root.settings = { language: "de", mode: "assessment", vibration: false, taskParams: {}, staircases: {}, notices: {} };
  delete old.protocolVersion; delete old.practiceCount; delete old.practiceOnly;
  root.sessions.push(old);
  const f = fixture({ data: root });
  assert.equal(f.C.Storage.getSessions().length, 1);
  assert.equal(f.C.Storage.getSettings().language, "de");
  assert.equal(f.C.Storage.getSettings().warmupPolicy, "familiar");
  assert.equal(f.C.Storage.getSettings().inputMethod, "auto");
  assert.equal(f.C.Storage.getSettings().routineMinutes, 10);
  assert.equal(f.C.Storage.getRoutine(), null);
  assert.equal(f.writes, 0, "Reading valid data should not cause a write");
});

test("only raw rows older than 90 days expire; summaries and forecasts stay", () => {
  const original = fixture(), root = original.C.Storage.snapshot();
  root.sessions.push(session(original, { id: "old", startedAt: "2025-09-01T00:00:00Z" }), session(original, { id: "recent" }));
  root.trials = { old: [{ correct: true }], recent: [{ correct: false }] };
  const f = fixture({ data: root });
  assert.equal(f.C.Storage.getSessions().length, 2);
  assert.equal(f.C.Storage.getTrials("old").length, 0);
  assert.equal(f.C.Storage.getTrials("recent").length, 1);
  assert.equal(f.writes, 1);
  const restored = fixture({ data: f.storage.get("cortex.v1") });
  assert.equal(restored.writes, 0);
});

test("quota, unavailable and corrupt storage preserve exportable pending work", () => {
  for (const options of [{ quota: true }, { blocked: true }, { data: "{broken" }]) {
    const f = fixture(options), notices = [];
    f.C.Storage.onWarning(warning => { if (warning) notices.push(warning.key); });
    const summary = session(f);
    assert.equal(f.C.Storage.appendSession(summary, [{ correct: true }]), false);
    assert.equal(f.C.Storage.pending, true);
    assert.equal(f.C.Storage.getSessions().length, 1);
    let exported;
    f.C.download = (_, text) => { exported = text; };
    f.C.Storage.exportAll();
    assert.equal(JSON.parse(exported).sessions[0].id, summary.id);
    assert.ok(notices.includes(options.quota ? "data.quota" : options.blocked ? "data.unavailable" : "data.corrupt"));
    if (options.data) {
      assert.equal(f.storage.get("cortex.v1"), "{broken");
      f.C.Storage.exportOriginal();
      assert.equal(exported, "{broken");
    }
  }
});

test("restoring and merging are idempotent, including duplicate incoming raw rows", async () => {
  const f = fixture(), incoming = f.C.Storage.snapshot(), row = session(f);
  incoming.sessions = [row];
  incoming.trials[row.id] = [{ index: 1 }, { index: 1 }, { index: 2 }];
  incoming.settings.language = "de";
  incoming.routine = f.C.Routine.build(15);
  const restored = await f.C.Storage.importAll(file(incoming));
  assert.equal(restored.added, 1);
  assert.equal(restored.saved, true);
  assert.equal(restored.localSettingsKept, false);
  assert.equal(f.C.Storage.getTrials(row.id).length, 2);
  assert.equal(f.C.Storage.getSettings().language, "de");
  assert.equal(f.C.Storage.getRoutine().id, incoming.routine.id);
  const again = await f.C.Storage.importAll(file(incoming));
  assert.equal(again.added, 0);
  assert.equal(f.C.Storage.getTrials(row.id).length, 2);
  const changed = plain(incoming); changed.sessions[0].score.accuracy = .1; changed.settings.language = "en";
  const report = await f.C.Storage.importAll(file(changed));
  assert.equal(report.conflicts, 1);
  assert.equal(report.added, 1);
  assert.equal(report.localSettingsKept, true);
  assert.equal(f.C.Storage.getSettings().language, "de");
  const conflict = f.C.Storage.getSessions().find(item => item.id !== row.id);
  assert.equal(f.C.Storage.getTrials(conflict.id).length, 2);
  assert.equal(f.C.Storage.getRoutine().id, incoming.routine.id);
});

test("invalid imports reject before mutating local data", async () => {
  const f = fixture();
  f.C.Storage.appendSession(session(f), []);
  const initial = JSON.stringify(f.C.Storage.snapshot());
  for (const modify of [
    root => { root.schemaVersion = 99; },
    root => { root.settings.language = "fr"; },
    root => { root.settings.routineMinutes = 12; },
    root => { root.sessions.push(plain(root.sessions[0])); },
    root => { root.sessions[0].startedAt = "2026-02-30T12:00:00Z"; },
    root => { root.sessions[0].durationMs = -1; },
    root => { root.trials.unknown = []; },
    root => { root.routine = { minutes: 10, steps: [] }; }
  ]) {
    const root = JSON.parse(initial); modify(root);
    await assert.rejects(f.C.Storage.importAll(file(root)), /data\./);
    assert.equal(JSON.stringify(f.C.Storage.snapshot()), initial);
  }
});

test("idle tabs adopt new preferences; active or pending tabs cannot overwrite another tab", () => {
  for (const active of [false, true]) {
    const f = fixture(), incoming = f.C.Storage.snapshot();
    incoming.settings.language = "de"; incoming.settings.theme = "dark"; incoming.settings.inputMethod = "mouse";
    if (active) f.C.active = {};
    const raw = JSON.stringify(incoming);
    f.storage.set("cortex.v1", raw);
    const event = new Event("storage"); event.key = "cortex.v1"; event.newValue = raw;
    f.events.dispatchEvent(event);
    if (active) {
      assert.equal(f.C.language, "en");
      f.C.active = null;
      assert.equal(f.C.Storage.setSettings({ language: "en" }), false);
      assert.equal(f.storage.get("cortex.v1"), raw);
      assert.equal(f.C.Storage.pending, true);
    } else {
      assert.equal(f.C.language, "de");
      assert.equal(f.C.input, "mouse");
      assert.equal(f.document.documentElement.dataset.theme, "dark");
      assert.equal(f.C.Storage.pending, false);
    }
  }
});

test("only valid scored assessments start the fourteen-day cooldown", () => {
  const f = fixture();
  for (const row of [session(f, { id: "aborted", mode: "assessment", invalid: true }),
    session(f, { id: "practice", mode: "assessment", practiceOnly: true }),
    session(f, { id: "training" })]) f.C.Storage.appendSession(row, []);
  assert.equal(f.C.UI.cooldown("flanker-squared"), null);
  const scored = session(f, { id: "assessment", mode: "assessment" });
  f.C.Storage.appendSession(scored, []);
  assert.equal(f.C.UI.cooldown(scored.taskId), Date.parse(scored.startedAt) + 14 * 86400000);
  f.setTime(14 * 86400000);
  assert.equal(f.C.UI.cooldown(scored.taskId), null);
});

test("daily selection uses local calendar dates and all three budgets produce valid profiles", () => {
  const previous = process.env.TZ;
  process.env.TZ = "America/Los_Angeles";
  try {
    const f = fixture({ epoch: Date.UTC(2026, 0, 2, 2) });
    assert.equal(f.C.today(), "2026-01-01", "Late local evening is not the following UTC day");
    for (const minutes of [10, 15, 20]) {
      const routine = f.C.Routine.build(minutes), again = f.C.Routine.build(minutes);
      assert.equal(routine.date, f.C.today());
      assert.equal(routine.steps.length, minutes === 10 ? 3 : minutes === 15 ? 4 : 5);
      assert.equal(f.C.canonical(routine.steps), f.C.canonical(again.steps));
      for (const step of routine.steps) {
        const task = f.C.Tasks.find(item => item.id === step.taskId);
        assert.equal(f.C.parameterError(task, step.params), null);
        assert.notEqual(task.id, "forecasting");
      }
    }
    assert.throws(() => f.C.Routine.build(12), /budget/);
  } finally {
    if (previous === undefined) delete process.env.TZ;
    else process.env.TZ = previous;
  }
});

test("routine progression and adaptive settings are saved atomically and survive a reload", () => {
  const f = fixture();
  const routine = f.C.Routine.start(), next = f.C.Routine.next(), before = f.writes;
  const summary = session(f, { id: "routine-round", taskId: next.task.id, params: next.step.params,
    routineId: routine.id, routineStep: next.index });
  const nextSettings = f.C.Storage.getSettings(); nextSettings.staircases.sample = { value: 2 };
  f.C.Storage.appendSession(summary, [{ correct: true }], { routine: f.C.Routine.withSession(summary),
    settings: nextSettings, itemHashes: { [next.task.id]: ["item-1"] } });
  assert.equal(f.writes, before + 1);
  assert.equal(f.C.Routine.next().index, 1);
  const resumed = fixture({ data: f.storage.get("cortex.v1") });
  assert.equal(resumed.C.Routine.next().index, 1);
  assert.equal(resumed.C.Storage.getSettings().staircases.sample.value, 2);
  assert.equal(resumed.C.Storage.getItemHashes(next.task.id)[0], "item-1");
  assert.equal(resumed.C.Storage.getTrials(summary.id).length, 1);
  assert.equal(resumed.C.Storage.getRoutine().id, routine.id);
  resumed.C.Routine.skip(); resumed.C.Routine.skip();
  assert.equal(resumed.C.Routine.next(), null);
  assert.equal(resumed.C.Routine.isDone(resumed.C.Routine.current()), true);
  assert.ok(resumed.C.Routine.current().completedAt);
});

test("invalid and practice-only attempts offer the same routine step rather than advancing it", () => {
  const f = fixture(), routine = f.C.Routine.start(), next = f.C.Routine.next();
  for (const [index, overrides] of [{ invalid: true }, { practiceOnly: true }].entries()) {
    const summary = session(f, { id: `invalid-${index}`, taskId: next.task.id, params: next.step.params,
      routineId: routine.id, routineStep: 0, ...overrides });
    f.C.Storage.appendSession(summary, [], { routine: f.C.Routine.withSession(summary) });
    assert.equal(f.C.Routine.next().index, 0);
    assert.equal(f.C.Routine.current().steps[0].lastAttemptId, summary.id);
  }
  f.setTime(86400000);
  assert.equal(f.C.Routine.current(), null);
});

test("familiarity depends on successful practice of the exact setup and never bypasses assessment", () => {
  const f = fixture(), task = f.C.Tasks.find(entry => entry.id === "flanker-squared");
  const ctx = f.runner("training", "keyboard", task); ctx.phase = "practice";
  ctx.practiceTrials = Array.from({ length: 8 }, (_, index) => ({ stimulusOnset: index * 1000, correct: index < 6, rtMs: 300 }));
  f.C.Routine.recordPractice(ctx);
  assert.equal(f.C.Routine.canSkipPractice(task, task.params), true);
  assert.equal(f.C.Routine.canSkipPractice(task, { ...task.params, deadlineMs: 500 }), false);
  assert.equal(f.C.Routine.canSkipPractice(task, task.params, "assessment"), false);
  f.C.input = "mouse";
  assert.equal(f.C.Routine.canSkipPractice(task, task.params), false);
  f.C.input = "keyboard"; f.C.Storage.setSettings({ warmupPolicy: "always" });
  assert.equal(f.C.Routine.canSkipPractice(task, task.params), false);
});

test("JSON backups remain restorable, CSV formulas are neutralized, and wiping needs explicit confirmation", async () => {
  const f = fixture();
  f.C.Storage.appendSession(session(f), [{ correct: true }]);
  let exported;
  f.C.download = (_, text) => { exported = text; };
  f.C.Storage.exportAll();
  const restored = fixture(); await restored.C.Storage.importAll({ text: async () => exported });
  assert.equal(restored.C.Storage.getSessions().length, 1);
  assert.equal(f.C.csvCell("=SUM(A1:A3)"), "\"'=SUM(A1:A3)\"");
  assert.equal(f.C.csvCell('a"b'), '"a""b"');
  assert.throws(() => f.C.Storage.wipe("delete"), /data.confirmError/);
  assert.equal(f.C.Storage.getSessions().length, 1);
  assert.equal(f.C.Storage.wipe("DELETE"), true);
  assert.equal(f.C.Storage.getSessions().length, 0);
  assert.equal(f.C.Storage.getSettings().routineMinutes, 10);
});
