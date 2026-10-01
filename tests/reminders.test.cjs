"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { fixture } = require("./helpers/fixture.cjs");
const { session } = require("./helpers/session.cjs");

function reminders({ permission = "granted", time = new Date(2026, 0, 1, 8, 10), ...options } = {}) {
  const f = fixture({ epoch: time.getTime(), ...options }), shown = [], notices = [];
  let requests = 0;
  f.env.isSecureContext = true;
  const registration = {
    active: {}, scope: "https://example.test/gym/",
    showNotification: async (title, data) => { shown.push({ title, data }); }
  };
  f.env.Notification = {
    permission,
    requestPermission: async () => { requests++; f.env.Notification.permission = "granted"; return "granted"; }
  };
  f.env.navigator.serviceWorker = { getRegistration: async () => registration, ready: Promise.resolve(registration) };
  f.C.notice = key => notices.push(key);
  f.C.Storage.setSettings({ routineReminders: true });
  return { ...f, registration, shown, notices, get requests() { return requests; } };
}

test("browser reminders never request permission automatically, including initialization and visibility changes", async () => {
  const f = reminders({ permission: "default" });
  f.C.Reminders.init(); f.C.Reminders.init();
  f.events.dispatchEvent(new Event("focus"));
  f.document.dispatchEvent(new Event("visibilitychange"));
  f.expire(30000);
  assert.equal(await f.C.Reminders.check(), false);
  assert.equal(f.requests, 0);
  assert.equal(f.shown.length, 0);
  assert.equal([...f.timers.values()].filter(timer => timer.interval).length, 1);
});

test("explicit permission is requested immediately, waits for worker readiness and does not save opt-in", async () => {
  const f = reminders({ permission: "default" });
  f.C.Storage.setSettings({ routineReminders: false });
  let finish;
  f.env.Notification.requestPermission = () => new Promise(resolve => { finish = resolve; });
  const first = f.C.Reminders.requestPermission(), second = f.C.Reminders.requestPermission();
  assert.equal(typeof finish, "function");
  assert.equal(f.C.Reminders.pending, true);
  assert.equal(f.C.Storage.getSettings().routineReminders, false);
  f.env.Notification.permission = "granted"; finish("granted");
  assert.equal(await first, true);
  assert.equal(await second, true);
  assert.equal(f.C.Reminders.pending, false);
  assert.equal(f.C.Storage.getSettings().routineReminders, false);
  assert.equal(f.shown.length, 0);
});

test("denied, insecure and unsupported notification contexts cannot send or silently enable reminders", async () => {
  const denied = reminders({ permission: "denied" });
  denied.env.Notification.requestPermission = async () => "denied";
  assert.equal(await denied.C.Reminders.requestPermission(), false);
  assert.equal(await denied.C.Reminders.check(), false);
  assert.equal(denied.shown.length, 0);
  for (const state of ["insecure", "unsupported"]) {
    const f = reminders();
    if (state === "insecure") f.env.isSecureContext = false; else delete f.env.Notification;
    assert.equal(f.C.Reminders.status(), state);
    await assert.rejects(f.C.Reminders.requestPermission(), new RegExp(`reminders.${state}`));
    assert.equal(await f.C.Reminders.check(), false);
    assert.equal(f.C.Reminders.pending, false);
  }
});

test("selected-day reminders use the worker and are persisted once per local date", async () => {
  const f = reminders();
  assert.equal(await f.C.Reminders.check(), true);
  assert.equal(f.shown.length, 1);
  const { title, data } = f.shown[0];
  assert.equal(title, "BBG");
  assert.equal(data.tag, `bbg-practice-${f.C.today()}`);
  assert.equal(data.renotify, false);
  assert.equal(data.icon, "https://example.test/gym/icons/icon-192.png");
  assert.equal(f.C.Storage.getSettings().reminderLastDate, f.C.today());
  assert.equal(await f.C.Reminders.check(), false);
  const restored = reminders({ data: f.storage.get("cortex.v1") });
  assert.equal(await restored.C.Reminders.check(), false);
  f.setTime(86400000);
  assert.equal(await f.C.Reminders.check(), true);
  assert.equal(f.shown.length, 2);
});

test("reminders require a selected local weekday and a start within the exact thirty-minute window", async () => {
  for (const [hours, minutes, seconds, expected] of [[7, 59, 59, false], [8, 0, 0, true],
    [8, 29, 59, true], [8, 30, 0, false], [10, 0, 0, false]]) {
    const f = reminders({ time: new Date(2026, 0, 1, hours, minutes, seconds) });
    assert.equal(await f.C.Reminders.check(), expected);
  }
  const f = reminders();
  f.C.Storage.setSettings({ routineDays: [1] });
  assert.equal(await f.C.Reminders.check(), false);
  f.C.Storage.setSettings({ routineDays: [], routineReminders: false, routineTime: "" });
  assert.equal(await f.C.Reminders.check(), false);
});

test("completed practice and a started daily plan suppress reminders; interrupted and practice-only attempts do not", async () => {
  for (const [overrides, expected] of [[{ completedMain: true }, false],
    [{ mode: "assessment" }, false], [{ completedMain: true, invalid: true, invalidReasons: ["runner.refresh"] }, false],
    [{ invalid: true, invalidReasons: ["runner.hidden"] }, true], [{ practiceOnly: true }, true],
    [{ startedAt: new Date(2025, 11, 31, 8, 10).toISOString() }, true]]) {
    const f = reminders();
    f.C.Storage.appendSession(session(f, overrides), []);
    assert.equal(await f.C.Reminders.check(), expected);
  }
  const f = reminders();
  f.C.Routine.start();
  assert.equal(await f.C.Reminders.check(), false);
});

test("running, starting and pending-storage guards precede expensive settings or history reads", async () => {
  for (const state of ["active", "starting", "pending"]) {
    const f = reminders();
    if (state === "pending") Object.defineProperty(f.C.Storage, "pending", { get: () => true });
    else f.C[state] = true;
    f.C.Storage.getSettings = f.C.Storage.getSessions = () => { throw new Error("A guarded check must not clone data"); };
    assert.equal(await f.C.Reminders.check(), false);
    assert.equal(f.shown.length, 0);
    assert.equal(f.notices.length, 0);
  }
});

test("worker readiness cannot race a newly-started round, modified preferences, duplicate checks or the due-window boundary", async () => {
  for (const change of ["active", "starting", "pending", "schedule", "late"]) {
    const f = reminders({ time: new Date(2026, 0, 1, 8, 29, 59) });
    let release;
    f.env.navigator.serviceWorker.getRegistration = () => new Promise(resolve => { release = resolve; });
    const checking = f.C.Reminders.check();
    assert.equal(await f.C.Reminders.check(), false);
    if (change === "schedule") f.C.Storage.setSettings({ routineTime: "18:00" });
    else if (change === "late") f.setTime(2000);
    else if (change === "pending") Object.defineProperty(f.C.Storage, "pending", { get: () => true });
    else f.C[change] = true;
    if (["active", "starting", "pending"].includes(change)) f.C.Storage.getSettings = () => { throw new Error("Activity must be checked first"); };
    release(f.registration);
    assert.equal(await checking, false, change);
    assert.equal(f.shown.length, 0);
    assert.equal(f.notices.length, 0);
  }
});

test("notification failures are visible, do not mark delivery successful, and retry only after explicit refresh", async () => {
  const f = reminders();
  f.registration.showNotification = async () => { throw new DOMException("Permission revoked", "NotAllowedError"); };
  assert.equal(await f.C.Reminders.check(), false);
  assert.equal(f.C.Storage.getSettings().reminderLastDate, null);
  assert.deepEqual(f.notices, ["reminders.failure"]);
  assert.equal(f.warnings.length, 1);
  assert.equal(await f.C.Reminders.check(), false);
  assert.equal(f.warnings.length, 1);
  f.registration.showNotification = async (title, data) => { f.shown.push({ title, data }); };
  assert.equal(await f.C.Reminders.refresh(), true);
  assert.equal(f.shown.length, 1);
});

test("unready service workers fail within five seconds and unavailable worker APIs are explicit errors", { timeout: 2000 }, async () => {
  const f = reminders();
  f.env.navigator.serviceWorker.getRegistration = async () => undefined;
  f.env.navigator.serviceWorker.ready = new Promise(() => {});
  const checking = f.C.Reminders.check();
  await new Promise(resolve => setImmediate(resolve));
  assert.ok([...f.timers.values()].some(timer => timer.ms === 5000));
  f.expire(5000);
  assert.equal(await checking, false);
  assert.deepEqual(f.notices, ["reminders.failure"]);
  const unavailable = reminders();
  delete unavailable.registration.showNotification;
  await assert.rejects(unavailable.C.Reminders.requestPermission(), /reminders.workerUnavailable/);
  assert.equal(unavailable.C.Reminders.pending, false);
});

test("available Web Locks serialize tab delivery and a busy lock skips rather than queues a stale reminder", async () => {
  for (const locked of [false, true]) {
    const f = reminders(), calls = [];
    f.env.navigator.locks = {
      request: async (name, options, callback) => { calls.push({ name, options }); return callback(locked ? null : {}); }
    };
    assert.equal(await f.C.Reminders.check(), !locked);
    assert.equal(calls[0].name, "bbg-practice-reminder");
    assert.equal(calls[0].options.ifAvailable, true);
  }
});

test("notification timing follows local DST normalization instead of naive minute-of-day arithmetic", async () => {
  const previous = process.env.TZ;
  process.env.TZ = "America/Los_Angeles";
  try {
    const f = reminders({ time: new Date(2026, 2, 8, 3, 35) });
    f.C.Storage.setSettings({ routineTime: "02:30", routineDays: [0] });
    assert.equal(await f.C.Reminders.check(), true);
    assert.equal(f.C.Storage.getSettings().reminderLastDate, "2026-03-08");
  } finally {
    if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
  }
});

test("notification clicks focus an existing scoped tab without navigating or losing its draft", async () => {
  const handlers = new Map(), scope = "https://example.test/gym/", opened = [];
  let focused = 0, closed = 0;
  const existing = { url: `${scope}#task/forecasting`, focus: async () => { focused++; },
    navigate: () => { throw new Error("Notifications must not reload existing work"); } };
  const unrelated = { url: `${scope}another-app/`, focus: () => { throw new Error("Do not focus a different app"); } };
  let windows = [{ url: "https://example.test/other/" }, unrelated, existing];
  vm.runInNewContext(readFileSync(path.join(__dirname, "..", "sw.js"), "utf8"), { URL, self: {
    registration: { scope }, addEventListener: (name, handler) => handlers.set(name, handler),
    clients: { matchAll: async () => windows, openWindow: async url => { opened.push(url); } }
  } });
  let finished;
  const event = { notification: { tag: "bbg-practice-2026-01-01", close: () => { closed++; } },
    waitUntil: promise => { finished = promise; } };
  handlers.get("notificationclick")(event); await finished;
  assert.equal(focused, 1); assert.equal(closed, 1); assert.equal(opened.length, 0);
  existing.url = `${scope}index.html?scoutTheme=dark#session/private`;
  handlers.get("notificationclick")(event); await finished;
  assert.equal(focused, 2); assert.equal(opened.length, 0);
  windows = [unrelated];
  handlers.get("notificationclick")(event); await finished;
  assert.deepEqual(opened, [`${scope}#home`]);
  event.notification.tag = "another-app";
  handlers.get("notificationclick")(event);
  assert.equal(closed, 3);
});
