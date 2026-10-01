"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { fixture } = require("./helpers/fixture.cjs");
const plain = value => JSON.parse(JSON.stringify(value));

test("legacy preferences retain morning defaults without enabling notifications or rewriting storage", () => {
  const source = fixture(), root = source.C.Storage.snapshot();
  for (const key of ["routineTime", "routineDays", "routineReminders", "reminderLastDate"]) delete root.settings[key];
  const f = fixture({ data: root }), value = f.C.Storage.getSettings();
  assert.equal(value.routineTime, "08:00");
  assert.deepEqual(plain(value.routineDays), [1, 2, 3, 4, 5, 6, 0]);
  assert.equal(value.routineReminders, false);
  assert.equal(value.reminderLastDate, null);
  assert.equal(f.writes, 0);
});

test("practice labels reflect preferred time, including flexible or unscheduled practice", () => {
  const f = fixture(), now = new Date(2026, 0, 1, 10);
  for (const [time, period] of [["00:00", "night"], ["04:59", "night"], ["05:00", "morning"],
    ["11:59", "morning"], ["12:00", "afternoon"], ["16:59", "afternoon"], ["17:00", "evening"],
    ["20:59", "evening"], ["21:00", "night"], ["23:59", "night"], ["", "flexible"]]) {
    const schedule = f.C.Routine.schedule({ routineTime: time }, now);
    assert.equal(schedule.titleKey, `routine.title.${period}`);
  }
  assert.equal(f.C.Routine.schedule({ routineDays: [], routineTime: "08:00" }, now).titleKey, "routine.title.flexible");
  assert.throws(() => f.C.Routine.schedule({}, new Date(NaN)), /valid local date/);
});

test("selected weekdays use local dates and choose the next future preferred start", () => {
  const f = fixture(), prefs = { routineDays: [1, 3, 5], routineTime: "18:30" };
  const thursday = new Date(2026, 0, 1, 10);
  const schedule = f.C.Routine.schedule(prefs, thursday);
  assert.equal(schedule.scheduledToday, false);
  assert.equal(schedule.date, "2026-01-01");
  assert.equal(schedule.next.getDay(), 5);
  assert.equal(f.C.today(schedule.next), "2026-01-02");
  assert.equal(schedule.next.getHours(), 18);
  assert.equal(schedule.next.getMinutes(), 30);
  const after = f.C.Routine.schedule(prefs, new Date(2026, 0, 2, 18, 31));
  assert.equal(after.scheduledToday, true);
  assert.equal(f.C.today(after.next), "2026-01-05");
  assert.equal(f.C.Routine.schedule({ routineDays: [] }, thursday).next, null);
  assert.equal(f.C.Routine.schedule({ routineTime: "" }, thursday).next, null);
  const nextYear = f.C.Routine.schedule({ routineDays: [6], routineTime: "09:00" }, new Date(2025, 11, 31, 23, 45));
  assert.equal(f.C.today(nextYear.next), "2026-01-03");
});

test("schedule preferences persist and do not rewrite an already-started routine", () => {
  const f = fixture(), started = f.C.Routine.start();
  const snapshot = JSON.stringify(started);
  f.C.Storage.setSettings({ routineMinutes: 20, routineTime: "18:30", routineDays: [1, 3, 5] });
  assert.equal(JSON.stringify(f.C.Routine.current()), snapshot);
  const restored = fixture({ data: f.storage.get("cortex.v1") });
  assert.equal(restored.C.Storage.getSettings().routineTime, "18:30");
  assert.deepEqual(plain(restored.C.Storage.getSettings().routineDays), [1, 3, 5]);
  assert.equal(restored.C.Routine.current().minutes, 10);
  restored.setTime(86400000);
  assert.equal(restored.C.Routine.preview().minutes, 20);
  assert.equal(restored.C.Storage.snapshot().schemaVersion, 1);
});

test("invalid schedule settings and imports reject before changing local data", async () => {
  const f = fixture(), initial = JSON.stringify(f.C.Storage.snapshot());
  for (const invalid of [null, [], "08:00", 10]) {
    assert.throws(() => f.C.Routine.schedule(invalid), /preferences.scheduleInvalid/);
    assert.throws(() => f.C.Storage.setSettings(invalid), /preferences.scheduleInvalid/);
    assert.equal(JSON.stringify(f.C.Storage.snapshot()), initial);
  }
  for (const next of [{ routineDays: [1, 1] }, { routineDays: [7] }, { routineDays: ["1"] },
    { routineDays: null }, { routineTime: "24:00" }, { routineTime: "8:00" }, { routineTime: "12:60" },
    { routineTime: null }, { routineMinutes: 12 }, { routineReminders: "yes" },
    { routineReminders: true, routineDays: [] }, { routineReminders: true, routineTime: "" },
    { reminderLastDate: "2026-02-30" }]) {
    assert.throws(() => f.C.Storage.setSettings(next), /preferences\./);
    assert.equal(JSON.stringify(f.C.Storage.snapshot()), initial);
    const incoming = JSON.parse(initial);
    Object.assign(incoming.settings, next);
    await assert.rejects(f.C.Storage.importAll({ text: async () => JSON.stringify(incoming) }), /data.invalid/);
    assert.equal(JSON.stringify(f.C.Storage.snapshot()), initial);
  }
});

test("weekly calendar reminders use floating local time, chosen days and valid UTF-8 folding", () => {
  const f = fixture();
  for (const language of ["en", "de"]) {
    f.C.language = language;
    const text = f.C.Routine.calendar({ routineTime: "18:30", routineDays: [5, 1, 3], routineMinutes: 20 },
      new Date(2026, 0, 1, 10));
    const unfolded = text.replace(/\r\n /g, "");
    assert.ok(text.endsWith("\r\n"));
    assert.match(unfolded, /DTSTART:20260102T183000\r\n/);
    assert.match(unfolded, /DURATION:PT20M\r\n/);
    assert.match(unfolded, /RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR;WKST=MO\r\n/);
    assert.match(unfolded, /BEGIN:VALARM\r\nTRIGGER:PT0M\r\nACTION:DISPLAY/);
    assert.match(unfolded, /SUMMARY:BBG - /);
    assert.ok(unfolded.includes(language === "en" ? "budget\\; exercises" : "Budget\\; Übungen"));
    assert.doesNotMatch(unfolded, /TZID=|DTSTART:.*Z/);
    for (const line of text.split("\r\n")) assert.ok(Buffer.byteLength(line, "utf8") <= 75, line);
    assert.equal(text.replace(/\r\n/g, "").includes("\n"), false);
  }
  assert.throws(() => f.C.Routine.calendar({ routineDays: [] }), /preferences.reminderScheduleRequired/);
  assert.throws(() => f.C.Routine.calendar({ routineTime: "" }), /preferences.reminderScheduleRequired/);
  const translate = f.C.t, description = "Calendar; first, second\\path\r\n\u00dcber \ud83d\udc4b ".repeat(8);
  f.C.t = (key, ...args) => key === "preferences.calendarDescription" ? description : translate(key, ...args);
  const escaped = f.C.Routine.calendar();
  assert.ok(escaped.replace(/\r\n /g, "").includes(`DESCRIPTION:${description.replace(/\\/g, "\\\\")
    .replace(/\r\n/g, "\\n").replace(/;/g, "\\;").replace(/,/g, "\\,")}\r\n`));
  for (const line of escaped.split("\r\n")) assert.ok(Buffer.byteLength(line, "utf8") <= 75, line);
});

test("preferred times retain local weekday semantics at timezone and daylight-saving boundaries", () => {
  const previous = process.env.TZ;
  process.env.TZ = "America/Los_Angeles";
  try {
    const f = fixture(), date = new Date("2026-01-02T00:30:00Z");
    assert.equal(f.C.today(date), "2026-01-01");
    assert.equal(f.C.Routine.schedule({ routineDays: [4], routineTime: "18:00" }, date).scheduledToday, true);
    const next = f.C.Routine.schedule({ routineDays: [0], routineTime: "02:30" }, new Date(2026, 2, 8, 1, 59)).next;
    assert.equal(f.C.today(next), "2026-03-08");
    assert.equal(next.getHours(), 3);
    assert.equal(next.getMinutes(), 30);
  } finally {
    if (previous === undefined) delete process.env.TZ; else process.env.TZ = previous;
  }
});

test("app sharing preserves deployment paths but drops query parameters and private route identifiers", () => {
  const f = fixture();
  for (const [address, expected] of [
    ["https://example.test/gym/?token=private&scoutTheme=dark#session/sensitive-result", "https://example.test/gym/#home"],
    ["https://example.test/gym/index.html?secret=private#task/forecasting", "https://example.test/gym/#home"],
    ["http://127.0.0.1:4173/#session/private", "http://127.0.0.1:4173/#home"]
  ]) {
    f.env.location.href = address;
    const data = plain(f.C.UI.shareData());
    assert.deepEqual(Object.keys(data).sort(), ["text", "title", "url"]);
    assert.equal(data.title, "BBG"); assert.equal(data.url, expected);
    assert.match(data.text, /Benny's Brain Gym/);
    assert.doesNotMatch(JSON.stringify(data), /private|sensitive|token|scoutTheme|forecasting/);
  }
});

test("sharing never reads private local settings, history, forecasts or scores", () => {
  const f = fixture();
  f.env.location.href = "https://example.test/#home";
  for (const key of ["snapshot", "getSettings", "getSessions", "getTrials", "getForecasts"]) {
    f.C.Storage[key] = () => { throw new Error("Sharing must not access private data"); };
  }
  assert.equal(f.C.UI.shareData().url, "https://example.test/#home");
});
