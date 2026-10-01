"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { fixture } = require("./helpers/fixture.cjs");
const { session } = require("./helpers/session.cjs");
const plain = value => JSON.parse(JSON.stringify(value));
const file = value => ({ text: async () => JSON.stringify(value) });

test("legacy appearances gain Graphite without changing brightness, history or storage", () => {
  const source = fixture(), root = source.C.Storage.snapshot();
  delete root.settings.colorTheme;
  root.settings.theme = "dark";
  root.sessions.push(session(source));
  root.routine = source.C.Routine.start();
  const f = fixture({ data: root });
  f.C.UI.syncPreferences();
  assert.equal(f.C.Storage.getSettings().colorTheme, "graphite");
  assert.equal(f.C.Storage.getSettings().theme, "dark");
  assert.equal(f.document.documentElement.dataset.theme, "dark");
  assert.equal(f.document.documentElement.dataset.colorTheme, "graphite");
  assert.deepEqual(plain(f.C.Storage.getSessions()), plain(root.sessions));
  assert.deepEqual(plain(f.C.Storage.getRoutine()), plain(root.routine));
  assert.equal(f.writes, 0);
});

test("Graphite is the fresh, reset and legacy-backup default while saved color choices survive", async () => {
  const f = fixture();
  assert.equal(f.C.Storage.getSettings().colorTheme, "graphite");
  assert.equal(f.C.Storage.getSettings().theme, "system");
  assert.equal(f.writes, 0);
  for (const colorTheme of ["rose", "amber"]) {
    f.C.Storage.setSettings({ colorTheme, theme: "dark" });
    const reloaded = fixture({ data: f.storage.get("cortex.v1") });
    reloaded.C.UI.syncPreferences();
    assert.equal(reloaded.C.Storage.getSettings().colorTheme, colorTheme);
    assert.equal(reloaded.document.documentElement.dataset.colorTheme, colorTheme);
    assert.equal(reloaded.document.documentElement.dataset.theme, "dark");
  }
  assert.equal(f.C.Storage.wipe("DELETE"), true);
  assert.equal(f.C.Storage.getSettings().colorTheme, "graphite");
  assert.equal(f.C.Storage.getSettings().theme, "system");
  const legacy = f.C.Storage.snapshot();
  delete legacy.settings.colorTheme;
  legacy.settings.theme = "light";
  const restored = fixture();
  await restored.C.Storage.importAll(file(legacy));
  restored.C.UI.syncPreferences();
  assert.equal(restored.document.documentElement.dataset.colorTheme, "graphite");
  assert.equal(restored.document.documentElement.dataset.theme, "light");
});

test("all appearance combinations persist without changing an already-started plan", () => {
  const f = fixture(), routine = plain(f.C.Routine.start());
  for (const theme of ["system", "light", "dark"]) for (const colorTheme of ["rose", "graphite", "amber"]) {
    assert.equal(f.C.Storage.setSettings({ theme, colorTheme }), true);
    f.C.UI.syncPreferences();
    assert.equal(f.document.documentElement.dataset.theme, theme === "system" ? "light" : theme);
    assert.equal(f.document.documentElement.dataset.colorTheme, colorTheme);
    const restored = fixture({ data: f.storage.get("cortex.v1") });
    assert.equal(restored.C.Storage.getSettings().theme, theme);
    assert.equal(restored.C.Storage.getSettings().colorTheme, colorTheme);
    assert.deepEqual(plain(restored.C.Storage.getRoutine()), routine);
    assert.equal(restored.C.Storage.snapshot().schemaVersion, 1);
  }
});

test("device and URL brightness overrides do not replace the saved color theme", () => {
  const f = fixture();
  let dark = false;
  f.env.matchMedia = query => ({ matches: query.includes("prefers-color-scheme") && dark });
  f.C.Storage.setSettings({ theme: "system", colorTheme: "graphite" });
  for (const deviceDark of [false, true]) {
    dark = deviceDark;
    f.C.UI.applyTheme();
    assert.equal(f.document.documentElement.dataset.theme, dark ? "dark" : "light");
    for (const theme of ["light", "dark"]) {
      f.C.UI.applyTheme({ theme, colorTheme: "amber" });
      assert.equal(f.document.documentElement.dataset.theme, theme);
      assert.equal(f.document.documentElement.dataset.colorTheme, "amber");
    }
  }
  for (const override of ["light", "dark"]) {
    f.env.location.search = `?scoutTheme=${override}`;
    f.C.UI.applyTheme();
    assert.equal(f.document.documentElement.dataset.theme, override);
    assert.equal(f.document.documentElement.dataset.colorTheme, "graphite");
  }
  f.env.location.search = "?scoutTheme=unknown";
  f.C.UI.applyTheme();
  assert.equal(f.document.documentElement.dataset.theme, "dark");
  assert.equal(f.C.Storage.getSettings().theme, "system");
  assert.equal(f.C.Storage.getSettings().colorTheme, "graphite");
});

test("invalid appearance settings and backups reject before mutating data", async () => {
  const f = fixture(), initial = JSON.stringify(f.C.Storage.snapshot()), writes = f.writes;
  for (const settings of [{ theme: null }, { theme: "auto" }, { theme: [] },
    { colorTheme: null }, { colorTheme: "" }, { colorTheme: "green" }, { colorTheme: "Rose" },
    { colorTheme: ["rose"] }, { colorTheme: 1 }]) {
    assert.throws(() => f.C.Storage.setSettings(settings), /preferences.appearanceInvalid/);
    assert.equal(JSON.stringify(f.C.Storage.snapshot()), initial);
    const incoming = JSON.parse(initial);
    Object.assign(incoming.settings, settings);
    await assert.rejects(f.C.Storage.importAll(file(incoming)), /data.invalid/);
    assert.equal(JSON.stringify(f.C.Storage.snapshot()), initial);
    assert.equal(f.writes, writes);
  }
});

test("backups restore appearance on empty profiles and keep local choices on nonempty merges", async () => {
  const source = fixture();
  source.C.Storage.setSettings({ theme: "dark", colorTheme: "amber" });
  const incoming = source.C.Storage.snapshot();
  incoming.sessions.push(session(source));
  const empty = fixture();
  assert.equal((await empty.C.Storage.importAll(file(incoming))).localSettingsKept, false);
  empty.C.UI.syncPreferences();
  assert.equal(empty.document.documentElement.dataset.colorTheme, "amber");
  assert.equal(empty.document.documentElement.dataset.theme, "dark");
  const existing = fixture();
  existing.C.Storage.appendSession(session(existing, { id: "local" }), []);
  existing.C.Storage.setSettings({ theme: "light", colorTheme: "graphite" });
  assert.equal((await existing.C.Storage.importAll(file(incoming))).localSettingsKept, true);
  existing.C.UI.syncPreferences();
  assert.equal(existing.document.documentElement.dataset.colorTheme, "graphite");
  assert.equal(existing.document.documentElement.dataset.theme, "light");
});

test("idle tabs adopt saved palettes without overwriting active or pending work", () => {
  for (const state of ["idle", "active", "pending"]) {
    const f = fixture({ quota: state === "pending" }), incoming = f.C.Storage.snapshot();
    incoming.settings.theme = "dark"; incoming.settings.colorTheme = "graphite";
    if (state === "active") f.C.active = {};
    if (state === "pending") f.C.Storage.setSettings({ colorTheme: "amber" });
    const raw = JSON.stringify(incoming), event = new Event("storage");
    event.key = "cortex.v1"; event.newValue = raw;
    f.storage.set("cortex.v1", raw); f.events.dispatchEvent(event);
    if (state === "idle") {
      assert.equal(f.document.documentElement.dataset.theme, "dark");
      assert.equal(f.document.documentElement.dataset.colorTheme, "graphite");
      assert.equal(f.C.Storage.pending, false);
    } else {
      assert.equal(f.C.Storage.getSettings().colorTheme, state === "pending" ? "amber" : "graphite");
      f.C.active = null;
      assert.equal(f.C.Storage.setSettings({ colorTheme: "rose" }), false);
      assert.equal(f.storage.get("cortex.v1"), raw);
    }
  }
});

test("progress series have matching line patterns and point shapes without relying on color", () => {
  const f = fixture(), task = f.C.Tasks.find(entry => entry.id === "flanker-squared");
  for (let group = 0; group < 4; group++) for (let point = 0; point < 2; point++) {
    f.C.Storage.appendSession(session(f, { id: `series-${group}-${point}`,
      startedAt: new Date(Date.UTC(2026, 0, 1, group, point)).toISOString(),
      params: { ...task.params, deadlineMs: 1000 + group * 100 },
      score: { correctPer90: 50 + group * 5 + point } }), []);
  }
  const markup = f.C.UI.chart(task, "training", "correctPer90");
  const patterns = expression => [...markup.matchAll(expression)].map(match => match[1]);
  const lines = patterns(/<polyline[^>]+stroke-dasharray="([^"]+)"/g);
  const legend = patterns(/<line x1="0"[^>]+stroke-dasharray="([^"]+)"/g);
  assert.deepEqual(lines, ["none", "8 4", "2 3", "8 3 2 3"]);
  assert.deepEqual(legend, lines);
  assert.deepEqual(patterns(/class="series-point" data-marker="([^"]+)"/g), ["0", "0", "1", "1", "2", "2", "3", "3"]);
  assert.equal((markup.match(/class="series-symbol"/g) || []).length, 4);
  assert.match(markup, /<circle/);
  assert.match(markup, /<rect/);
  assert.match(markup, /l5 5-5 5-5-5Z/);
  assert.match(markup, /l5 9H/);
});
