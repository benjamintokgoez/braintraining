"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const { fixture } = require("./helpers/fixture.cjs");
const plain = value => JSON.parse(JSON.stringify(value));
const introduction = "This is a public encyclopedia introduction about a scientific discovery and its development. " +
  "It describes the ideas and people involved, including the historical context and practical applications in everyday life.";
const page = (patch = {}) => ({ pageid: 12345, lastrevid: 98765, ns: 0, title: "An interesting discovery",
  extract: introduction, ...patch });
function enabled(options = {}) {
  const f = fixture(options);
  f.C.Storage.setSettings({ dailyReadingEnabled: true, dailyReadingInterests: ["science"] });
  return f;
}
function mock(f, pages = [page()]) {
  const calls = [];
  f.env.fetch = async (url, options) => {
    calls.push({ url, options });
    return { ok: true, json: async () => ({ query: { pages } }) };
  };
  return calls;
}
function record(f, patch = {}) {
  return f.C.Reading.fromPage(page(), { date: f.C.today(), language: f.C.language, interest: "science", ...patch });
}

test("legacy and fresh profiles keep Wikipedia disabled without silently rewriting preferences", async () => {
  const f = fixture(), root = f.C.Storage.snapshot();
  delete root.settings.dailyReadingEnabled; delete root.settings.dailyReadingInterests; delete root.dailyReading;
  const legacy = fixture({ data: root }), writes = legacy.writes;
  assert.equal(legacy.C.Storage.getSettings().dailyReadingEnabled, false);
  assert.deepEqual(plain(legacy.C.Storage.getSettings().dailyReadingInterests), ["science", "technology", "history", "nature"]);
  assert.equal(legacy.C.Storage.getDailyReading(), null);
  legacy.env.fetch = () => { throw new Error("No Wikipedia request before opt-in"); };
  assert.equal((await legacy.C.Reading.load()).status, "disabled");
  assert.equal(legacy.writes, writes);
});

test("a daily read uses anonymous CORS, a selected interest and the local language, then survives reload without refetching", async () => {
  for (const language of ["en", "de"]) {
    const f = enabled({ language }), calls = mock(f), result = await f.C.Reading.load();
    assert.equal(result.status, "ready");
    assert.equal(result.saved, true);
    assert.equal(result.record.language, language);
    assert.equal(result.record.interest, "science");
    assert.equal(result.record.text, introduction);
    assert.equal(result.record.shortened, false);
    assert.ok(f.C.Reading.seconds(result.record) <= 120);
    const request = calls[0], url = new URL(request.url);
    assert.equal(url.origin, `https://${language}.wikipedia.org`);
    assert.equal(url.searchParams.get("origin"), "*");
    assert.equal(url.searchParams.get("gsrsort"), "random");
    assert.equal(url.searchParams.get("gsrnamespace"), "0");
    assert.equal(url.searchParams.get("explaintext"), "1");
    assert.equal(request.options.credentials, "omit");
    assert.equal(request.options.referrerPolicy, "no-referrer");
    assert.equal(request.options.redirect, "error");
    assert.equal(url.searchParams.has("callback"), false);
    assert.equal(request.options.body, undefined);
    assert.equal(calls.length, 1);
    await f.C.Reading.load({ retry: true });
    assert.equal(calls.length, 1, "Retry does not replace a successful daily selection");
    const restored = fixture({ data: f.storage.get("cortex.v1"), language }), nextCalls = mock(restored);
    assert.deepEqual(plain((await restored.C.Reading.load()).record), plain(result.record));
    assert.equal(nextCalls.length, 0);
    assert.match(f.C.Reading.sourceURL(result.record), /curid=12345&oldid=98765$/);
    assert.match(f.C.Reading.historyURL(result.record), /curid=12345&action=history$/);
    assert.deepEqual(f.errors, []);
  }
});

test("every supported interest has explicit local-language Wikipedia categories and no unrelated profile data in requests", () => {
  const f = fixture();
  for (const language of ["en", "de"]) for (const interest of f.C.readingInterests) {
    const url = new URL(f.C.Reading.queryURL(language, interest));
    assert.ok(url.searchParams.get("gsrsearch").startsWith('incategory:"'));
    assert.ok(url.searchParams.get("gsrsearch").includes("|"), "CirrusSearch category unions use pipes, not boolean OR");
    assert.ok(!url.searchParams.get("gsrsearch").includes(" OR "));
    assert.ok(url.href.length < 1500);
    assert.equal(url.origin, `https://${language}.wikipedia.org`);
    assert.doesNotMatch(url.href, /forecast|score|session|languageDependent|private|token|api[_-]?key/i);
  }
  assert.throws(() => f.C.Reading.queryURL("es", "science"), /Unknown/);
  assert.throws(() => f.C.Reading.queryURL("en", "javascript:bad"), /Unknown/);
});

test("excerpt bounds are measured, preserve source wording and disclose shortening without AI", () => {
  const f = fixture();
  for (const language of ["en", "de"]) for (const raw of [
    Array(60).fill(introduction).join("\n\n"),
    Array(500).fill("encyclopedia").join(" "),
    `${"word ".repeat(180)}end.`,
    `${"Antidisestablishmentarianism ".repeat(200)}.`,
    `Dr. Ada researched this discovery in 1843. ${introduction} ${introduction} ${introduction} ${introduction}`
  ]) {
    const result = f.C.Reading.excerpt(raw, language);
    assert.ok(result.text.length <= f.C.readingLimits.characters);
    assert.ok(f.C.wordCount(result.text) <= f.C.readingLimits.words);
    assert.ok(result.text.length > 0);
    assert.ok(raw.replace(/\s+/gu, " ").trim().startsWith(result.text.replace(/\.\.\.$/, "")),
      "No words are invented, paraphrased or reordered");
    const normalized = raw.replace(/\s+/gu, " ").trim();
    assert.equal(result.shortened, normalized.length > f.C.readingLimits.characters ||
      f.C.wordCount(normalized) > f.C.readingLimits.words);
    assert.ok(f.C.Reading.seconds({ title: "A short title", text: result.text }) <= 120);
  }
  const atLimit = f.C.Reading.excerpt(`${"word ".repeat(179)}end.`, "en");
  assert.equal(atLimit.shortened, false);
  assert.equal(f.C.wordCount(atLimit.text), 180);
});

test("unsuitable Wikipedia results cannot become an attributed daily read", async () => {
  const f = enabled();
  for (const patch of [
    { ns: 1 }, { missing: true }, { pageprops: { disambiguation: "" } }, { extract: "Too short." },
    { extract: null }, { title: "List of discoveries" }, { title: "Liste der Dinge" },
    { title: "Long ".repeat(21) }, { lastrevid: undefined }, { pageid: -1 },
    { extract: `${introduction} {\\displaystyle invalid mathematical output}` },
    { extract: `${introduction} {{unexpanded template}}` }
  ]) assert.equal(f.C.Reading.fromPage(page(patch), { date: f.C.today(), language: "en", interest: "science" }), null);
  mock(f, [page({ extract: "Too short." })]);
  const result = await f.C.Reading.load();
  assert.equal(result.status, "error");
  assert.equal(result.message, "reading.noResult");
  assert.equal(f.C.Storage.getDailyReading(), null);
  assert.equal(f.warnings.length, 1);
  f.env.fetch = async () => ({ ok: true, json: async () => ({ batchcomplete: true }) });
  assert.equal((await f.C.Reading.load({ retry: true })).message, "reading.noResult");
});

test("one request serves concurrent callers and a successful read rotates next day without repeating the previous article", async () => {
  const f = enabled();
  let resolve, requests = 0;
  f.env.fetch = () => { requests++; return new Promise(done => { resolve = done; }); };
  const first = f.C.Reading.load(), second = f.C.Reading.load();
  assert.equal(requests, 1);
  resolve({ ok: true, json: async () => ({ query: { pages: [page()] } }) });
  assert.deepEqual(plain(await first), plain(await second));
  f.setTime(86400000);
  const calls = mock(f, [page(), page({ pageid: 67890, lastrevid: 123456, title: "Another discovery" })]);
  const next = await f.C.Reading.load();
  assert.equal(next.record.pageId, 67890);
  assert.equal(next.record.date, f.C.today());
  assert.equal(calls.length, 1);
});

test("a normal caller joins an explicit retry instead of replaying the previous failure", async () => {
  const f = enabled();
  f.env.fetch = async () => ({ ok: false, status: 503 });
  assert.equal((await f.C.Reading.load()).status, "error");
  let resolve, calls = 0;
  f.env.fetch = () => { calls++; return new Promise(done => { resolve = done; }); };
  const retry = f.C.Reading.load({ retry: true }), joined = f.C.Reading.load();
  resolve({ ok: true, json: async () => ({ query: { pages: [page()] } }) });
  assert.equal((await retry).status, "ready");
  assert.equal((await joined).status, "ready");
  assert.equal(calls, 1);
});

test("a current cache arriving during a request wins over the late network response", async () => {
  const f = enabled();
  let resolve, signal;
  f.env.fetch = (_, options) => {
    signal = options.signal;
    return new Promise(done => { resolve = done; });
  };
  const pending = f.C.Reading.load(), saved = { ...record(f), pageId: 67890, title: "A saved discovery" };
  f.C.Storage.setDailyReading(saved);
  assert.deepEqual(plain((await f.C.Reading.load()).record), plain(saved));
  assert.equal(signal.aborted, true);
  resolve({ ok: true, json: async () => ({ query: { pages: [page()] } }) });
  assert.equal((await pending).status, "paused");
  assert.deepEqual(plain(f.C.Storage.getDailyReading()), plain(saved));
});

test("interest changes and language changes cannot reuse mismatched cached readings", async () => {
  const f = enabled(), calls = mock(f);
  await f.C.Reading.load();
  f.env.navigator.onLine = false;
  f.C.Storage.setSettings({ dailyReadingInterests: ["politics"] });
  assert.equal((await f.C.Reading.load()).record, null);
  f.C.Storage.setSettings({ dailyReadingInterests: ["science"], language: "de" });
  assert.equal((await f.C.Reading.load()).record, null);
  assert.equal(calls.length, 1);
  f.C.Storage.setSettings({ language: "en", dailyReadingInterests: ["science", "technology"] });
  assert.equal((await f.C.Reading.load()).record.pageId, 12345, "Adding an interest preserves today's matching selection");
});

test("offline use keeps a current read and clearly returns an older matching cache without requesting Wikipedia", async () => {
  const f = enabled(), calls = mock(f);
  await f.C.Reading.load();
  f.env.navigator.onLine = false;
  assert.equal((await f.C.Reading.load()).status, "ready");
  f.setTime(86400000);
  const result = await f.C.Reading.load();
  assert.equal(result.status, "offline");
  assert.notEqual(result.record.date, f.C.today());
  assert.equal(calls.length, 1);
});

test("HTTP, API, invalid JSON, connection and no-result failures are visible and retry only explicitly", async () => {
  for (const implementation of [
    async () => ({ ok: false, status: 429 }),
    async () => ({ ok: true, json: async () => ({ error: { code: "maxlag" } }) }),
    async () => ({ ok: true, json: async () => ({ query: { pages: {} } }) }),
    async () => ({ ok: true, json: async () => { throw new SyntaxError("Invalid JSON"); } }),
    async () => { throw new TypeError("Failed to fetch"); }
  ]) {
    const f = enabled();
    let calls = 0;
    f.env.fetch = (...args) => { calls++; return implementation(...args); };
    assert.equal((await f.C.Reading.load()).message, "reading.unavailable");
    assert.equal((await f.C.Reading.load()).status, "error");
    assert.equal(calls, 1);
    await f.C.Reading.load({ retry: true });
    assert.equal(calls, 2);
    mock(f);
    assert.equal((await f.C.Reading.load({ retry: true })).status, "ready");
  }
});

test("slow Wikipedia requests end within the configured timeout and clear their timer", async () => {
  const f = enabled();
  f.env.fetch = (_, { signal }) => new Promise((resolve, reject) => {
    signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
  const pending = f.C.Reading.load();
  assert.equal(f.C.Reading.timeoutMs, 8000);
  f.expire(8000);
  assert.equal((await pending).message, "reading.timeout");
  assert.ok([...f.timers.values()].every(timer => timer.ms !== 8000));
});

test("disabling, changing interests, hiding or starting training cancels or discards in-flight reads", async () => {
  for (const change of [
    f => f.C.Storage.setSettings({ dailyReadingEnabled: false }),
    f => f.C.Storage.setSettings({ dailyReadingInterests: ["politics"] }),
    f => { f.env.document.hidden = true; f.C.Reading.cancel(); },
    f => { f.C.starting = true; },
    f => { f.C.active = {}; }
  ]) {
    const f = enabled();
    let resolve, signal;
    f.env.fetch = (_, options) => { signal = options.signal; return new Promise(done => { resolve = done; }); };
    const pending = f.C.Reading.load();
    change(f);
    resolve({ ok: true, json: async () => ({ query: { pages: [page()] } }) });
    assert.equal((await pending).status, "paused");
    assert.equal(f.C.Storage.getDailyReading(), null);
    if (!f.C.active && !f.C.starting) assert.equal(signal.aborted, true);
  }
});

test("hidden pages and active or starting exercises never start a Wikipedia request", async () => {
  for (const patch of [{ hidden: true }, { active: {} }, { starting: true }]) {
    const f = enabled(), calls = mock(f);
    if (patch.hidden) f.env.document.hidden = true;
    else Object.assign(f.C, patch);
    assert.equal((await f.C.Reading.load()).status, "paused");
    assert.equal(calls.length, 0);
  }
});

test("reading settings, cache, backups and deletion follow local storage validation and pending-work rules", async () => {
  const f = enabled(), reading = record(f);
  f.C.Storage.setDailyReading(reading);
  const backup = f.C.Storage.snapshot(), restored = fixture();
  await restored.C.Storage.importAll({ text: async () => JSON.stringify(backup) });
  assert.deepEqual(plain(restored.C.Storage.getDailyReading()), plain(reading));
  assert.equal(restored.C.Storage.getSettings().dailyReadingEnabled, true);
  restored.C.Storage.prune();
  assert.deepEqual(plain(restored.C.Storage.getDailyReading()), plain(reading));
  for (const patch of [
    { dailyReadingEnabled: "yes" }, { dailyReadingInterests: ["unknown"] },
    { dailyReadingInterests: ["science", "science"] }, { dailyReadingInterests: "science" },
    { dailyReadingEnabled: true, dailyReadingInterests: [] }
  ]) assert.throws(() => restored.C.Storage.setSettings(patch), /reading\./);
  for (const patch of [{ pageId: 0 }, { revisionId: -1 }, { text: "word ".repeat(181) }, { language: "javascript" }]) {
    assert.throws(() => restored.C.Storage.setDailyReading({ ...reading, ...patch }), /data.invalid/);
    await assert.rejects(restored.C.Storage.importAll({ text: async () => JSON.stringify({
      ...backup, dailyReading: { ...reading, ...patch }
    }) }), /data.invalid/);
  }
  restored.C.Storage.wipe("DELETE");
  assert.equal(restored.C.Storage.getDailyReading(), null);
  assert.equal(restored.C.Storage.getSettings().dailyReadingEnabled, false);
  const quota = enabled({ quota: true });
  mock(quota);
  const result = await quota.C.Reading.load();
  assert.equal(result.status, "ready");
  assert.equal(result.saved, false);
  assert.equal(quota.C.Storage.pending, true);
  assert.equal(quota.C.Storage.getDailyReading().pageId, 12345);
});
