"use strict";

const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const path = require("node:path");
const { test } = require("node:test");
const vm = require("node:vm");

function fixture() {
  let time = 0;
  const timers = new Map(), draws = [], nodes = new Map(), spoken = [];
  const storage = new Map();
  const context2d = new Proxy({}, {
    get(target, key) {
      return key in target ? target[key] : (...args) => draws.push({ method: key, args, color: target.fillStyle });
    }
  });
  const element = () => Object.assign(new EventTarget(), {
    style: {}, textContent: "", getContext: () => context2d
  });
  const speech = Object.assign(new EventTarget(), {
    voices: [{ lang: "en-US", localService: true }, { lang: "de-DE", localService: true }],
    getVoices() { return this.voices; },
    speak(utterance) { spoken.push(utterance); },
    cancel() {}
  });
  const env = {
    console, Intl, DOMException, AbortController, Event, EventTarget, crypto: globalThis.crypto,
    navigator: { language: "en", maxTouchPoints: 0 },
    performance: { timeOrigin: Date.UTC(2026, 0, 1), now: () => time },
    innerWidth: 1024, innerHeight: 768, devicePixelRatio: 1,
    screen: { width: 1024, height: 768, orientation: Object.assign(new EventTarget(), { type: "landscape-primary" }) },
    matchMedia: () => ({ matches: false }),
    localStorage: { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) },
    addEventListener() {}, removeEventListener() {},
    document: {
      documentElement: element(),
      addEventListener() {},
      createElement: element,
      getElementById(id) {
        if (!nodes.has(id)) nodes.set(id, element());
        return nodes.get(id);
      }
    },
    getComputedStyle: () => ({ getPropertyValue: name => name, paddingBottom: "0", paddingLeft: "0", paddingRight: "0" }),
    speechSynthesis: speech,
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text; } },
    setTimeout(fn, ms) { const token = {}; timers.set(token, { fn, ms }); return token; },
    clearTimeout(token) { timers.delete(token); },
    requestAnimationFrame(fn) {
      setImmediate(() => { time += 16; env.onFrame?.(time); fn(time); });
    }
  };
  env.window = env;
  vm.createContext(env);
  for (const file of ["i18n.js", "app.js"]) {
    vm.runInContext(readFileSync(path.join(__dirname, "..", file), "utf8"), env, { filename: file });
  }
  const C = env.Cortex;
  C.Draw.init(); C.Timing.refreshHz = 60;
  const task = C.Tasks.find(entry => entry.id === "dual-nback");
  function runner(mode = "training", input = "keyboard") {
    const ctx = new C.Runner(task, { ...task.params }, mode, "en", input);
    ctx.phase = "block";
    return ctx;
  }
  function panel(ctx) {
    return ctx.prepareOptions([
      { value: 0, label: "Position match", key: "a" },
      { value: 1, label: "Audio match", key: "l" }
    ], "matches");
  }
  function key(ctx, value, properties = {}) {
    ctx.keyHandler({ key: value, code: `Key${value.toUpperCase()}`, preventDefault() {}, ...properties });
  }
  return { C, env, speech, spoken, draws, timers, task, runner, panel, key,
    expire(ms) {
      for (const [token, timer] of [...timers]) if (timer.ms === ms) { timers.delete(token); timer.fn(); }
    },
    setTime(value) { time = value; }
  };
}

test("letter names and words use local voices and distinct comparison sets", async () => {
  const { C, spoken, task } = fixture();
  assert.equal(C.taskParams(task).audioStimuli, "letters");
  const sets = new Set();
  for (const language of ["en", "de"]) for (const kind of ["letters", "words"]) {
    assert.equal(await C.Audio.unlock(language, kind), true);
    sets.add(C.Audio.stimulusSet);
    const sounds = C.Audio.prepare([0, 1, 2, 3, 4, 5, 6, 7], language, kind);
    assert.equal(new Set(sounds.map(sound => sound.utterance.text)).size, 8);
    for (const { utterance } of sounds) {
      assert.equal(utterance.voice.localService, true);
      assert.match(utterance.lang, new RegExp(`^${language}`));
      assert.doesNotMatch(utterance.text, /uppercase|capital|Großbuchstabe/);
      if (kind === "letters") assert.match(utterance.text, /^[a-z]{2,}$/);
    }
    if (kind === "letters") assert.equal(sounds[5].utterance.text, language === "en" ? "are" : "er");
  }
  assert.equal(sets.size, 4);
  assert.ok(spoken.every(utterance => utterance.volume === 0));
});

test("waits for local voices and never falls back to remote voices or tones", async () => {
  const { C, speech, expire, spoken } = fixture();
  speech.voices = [{ lang: "en-US", localService: false }];
  const unavailable = C.Audio.unlock("en", "letters");
  expire(1500);
  assert.equal(await unavailable, false);
  assert.equal(spoken.length, 0);
  const loading = C.Audio.unlock("en", "words");
  speech.voices.push({ lang: "en-GB", localService: true });
  speech.dispatchEvent(new Event("voiceschanged"));
  assert.equal(await loading, true);
  assert.equal(C.Audio.voice.lang, "en-GB");
});

test("speech records actual onset and surfaces timeout, overlap and cancellation", async () => {
  const { C, expire, setTime, timers } = fixture();
  await C.Audio.unlock("en", "letters");
  const [sound, other] = C.Audio.prepare([5, 0], "en", "letters");
  const trial = {};
  const playing = C.Audio.play(sound, trial);
  setTime(125); sound.utterance.onstart();
  sound.utterance.onend();
  await playing;
  assert.equal(trial.audioOnset, 125);
  assert.equal(timers.size, 0);
  const timedOut = assert.rejects(C.Audio.play(sound, {}, 700), /audio.failed/);
  expire(700); await timedOut;
  assert.equal(C.Audio.pending, null);
  const interrupted = assert.rejects(C.Audio.play(sound, {}), { name: "AbortError" });
  await assert.rejects(C.Audio.play(other, {}), /audio.failed/);
  await interrupted;
  const cancelled = assert.rejects(C.Audio.play(sound, {}), { name: "AbortError" });
  C.Audio.stop(); await cancelled;
  assert.equal(timers.size, 0);
});

test("both keys acknowledge immediately, survive hiding, and cannot duplicate or undo", async () => {
  const f = fixture(), ctx = f.runner();
  const panel = f.panel(ctx);
  let beforeHide = false, afterHide = false, repeated = false;
  f.env.onFrame = () => {
    const current = ctx.current;
    if (!current) return;
    const elapsed = f.C.now() - current.startedAt;
    if (elapsed >= 64 && !beforeHide) {
      f.key(ctx, "A");
      assert.match(ctx.responseStatus.textContent, /Recorded: Position match/);
      beforeHide = true;
    }
    if (elapsed >= 160 && !afterHide) {
      assert.equal(current.scene, ctx.blank);
      f.key(ctx, "l");
      assert.match(ctx.responseStatus.textContent, /Position match \+ Audio match/);
      afterHide = true;
    }
    if (elapsed >= 192 && !repeated) {
      f.key(ctx, "a"); f.key(ctx, "l", { repeat: true });
      assert.equal(current.responses.length, 2);
      repeated = true;
    }
  };
  const trial = await ctx.trial({ scene: f.C.Draw.grid(3, [1]), panel, deadline: 320, visibleMs: 128,
    multi: true, noFeedback: true, evaluate: values => values.includes(0) && values.includes(1) });
  assert.equal(trial.correct, true);
  assert.equal(trial.responses.length, 2);
  assert.equal(trial.rtMs, 64);
  assert.ok(beforeHide && afterHide && repeated);
  assert.ok(f.draws.some(draw => draw.method === "fillText" && draw.args[0] === "✓ Recorded"));
  assert.ok(f.draws.some(draw => draw.method === "fillRect" && draw.color === "--cp-accent"));
  await ctx.close();
});

test("warm-up, wrong keys, late keys and between-item keys give honest status", async () => {
  const f = fixture(), ctx = f.runner(), panel = f.panel(ctx);
  f.key(ctx, "a");
  assert.match(ctx.responseStatus.textContent, /Not recorded/);
  f.env.onFrame = () => { if (ctx.current) f.key(ctx, "a"); };
  const warmup = await ctx.trial({ panel, deadline: 64, multi: true, noFeedback: true, responseEnabled: false });
  assert.equal(warmup.responses.length, 0);
  let wrong = false;
  f.env.onFrame = () => {
    if (!ctx.current) return;
    if (!wrong) {
      f.key(ctx, "x"); wrong = true;
      assert.match(ctx.responseStatus.textContent, /use A \/ L/);
      f.key(ctx, "a", { ctrlKey: true });
      f.key(ctx, "a", { isComposing: true });
    }
    if (f.C.now() - ctx.current.startedAt >= 64) {
      f.key(ctx, "a");
      assert.match(ctx.responseStatus.textContent, /Too late/);
    }
  };
  const late = await ctx.trial({ panel, deadline: 64, multi: true, noFeedback: true });
  assert.equal(late.responses.length, 0);
  assert.equal(late.lateResponses.length, 1);
  await ctx.close();
});

test("simultaneous touch responses are accepted independently instead of aborting", async () => {
  const f = fixture(), ctx = f.runner("training", "touch"), panel = f.panel(ctx);
  let pressed = false;
  f.env.onFrame = () => {
    if (!ctx.current || pressed) return;
    panel.zones.forEach((zone, index) => ctx.pointerHandler({
      preventDefault() {}, pointerId: index, pointerType: "touch",
      clientX: zone.x + zone.w / 2, clientY: zone.y + zone.h / 2
    }));
    pressed = true;
  };
  const row = await ctx.trial({ panel, deadline: 64, multi: true, noFeedback: true });
  assert.equal(row.responses.length, 2);
  assert.equal(ctx.signal.aborted, false);
  assert.equal(ctx.invalid, false);
  await ctx.close();
});

test("correctness is evaluated after closing, never shown during assessment", async () => {
  for (const mode of ["training", "assessment"]) {
    const f = fixture(), ctx = f.runner(mode), panel = f.panel(ctx);
    let feedbackCount = 0;
    ctx.show = async () => { assert.equal(ctx.current, null); feedbackCount++; };
    let evaluations = 0;
    f.env.onFrame = () => {
      if (!ctx.current) return;
      assert.equal(evaluations, 0);
      if (f.C.now() - ctx.current.startedAt < 320) f.key(ctx, "a");
    };
    const trial = await ctx.trial({ panel, deadline: 320, multi: true,
      evaluate: values => { assert.equal(ctx.current, null); evaluations++; return values.includes(0); } });
    assert.equal(trial.correct, true);
    assert.equal(evaluations, 1);
    assert.equal(feedbackCount, mode === "training" ? 1 : 0);
    await ctx.close();
  }
});

test("new items reset confirmations; single and sequence inputs still work", async () => {
  const f = fixture(), ctx = f.runner(), panel = f.panel(ctx);
  f.env.onFrame = () => { if (ctx.current) f.key(ctx, "a"); };
  await ctx.trial({ panel, deadline: 64, multi: true, noFeedback: true });
  f.env.onFrame = () => {
    if (!ctx.current) return;
    assert.equal(ctx.current.responses.length, 0);
    assert.doesNotMatch(ctx.responseStatus.textContent, /Recorded:/);
    f.key(ctx, "a", { repeat: true });
    assert.match(ctx.responseStatus.textContent, /release A/);
    assert.equal(ctx.current.responses.length, 0);
  };
  await ctx.trial({ panel, deadline: 64, multi: true, noFeedback: true });
  const standard = ctx.prepareOptions([{ value: 0, label: "Yes", key: "a" }]);
  f.env.onFrame = () => { if (ctx.current) f.key(ctx, "a"); };
  const single = await ctx.trial({ panel: standard, deadline: 64, answer: 0, noFeedback: true });
  assert.equal(single.correct, true);
  const sequence = await ctx.trial({ panel: standard, deadline: 64, sequence: true, maxLength: 2, noFeedback: true });
  assert.equal(sequence.responses.length, 2);
  await ctx.close();
});

test("two fingers between n-back items do not abort; input-method changes remain flagged", async () => {
  const f = fixture(), ctx = f.runner();
  for (const pointerId of [1, 2]) ctx.pointerHandler({
    pointerId, preventDefault() {}, clientX: 10, clientY: 10, pointerType: "touch"
  });
  assert.equal(ctx.signal.aborted, false);
  assert.match(ctx.responseStatus.textContent, /Not recorded/);
  const panel = f.panel(ctx);
  f.env.onFrame = () => {
    if (!ctx.current) return;
    ctx.respond(0, "mouse");
  };
  await ctx.trial({ panel, deadline: 64, multi: true, noFeedback: true });
  assert.equal(ctx.invalid, true);
  assert.ok(ctx.reasons.includes("runner.inputChanged"));
  await ctx.close();
});

test("n-back variants wire warm-up, localized feedback, speech sets and scoring", async () => {
  for (const variant of ["dual", "audio", "position", "arithmetic"]) {
    const f = fixture(), ctx = f.runner();
    ctx.params.variant = variant;
    ctx.phase = "practice";
    ctx.show = async () => {};
    ctx.countdown = async () => {};
    await f.C.Audio.unlock("en", "words");
    ctx.params.audioStimuli = "words";
    const specs = [];
    ctx.trial = async spec => {
      specs.push(spec);
      const response = [
        ...(spec.meta.usePosition && spec.meta.positionTarget ? [0] : []),
        ...(spec.meta.useAudio && spec.meta.audioTarget ? [1] : [])
      ];
      return { ...spec.meta, response, correct: spec.evaluate(response) };
    };
    const result = await f.task.run(ctx);
    assert.equal(specs.length, 8);
    assert.ok(specs.slice(0, 2).every(spec => !spec.responseEnabled && spec.noFeedback));
    assert.ok(specs.slice(2).every(spec => spec.responseEnabled && !spec.noFeedback));
    assert.ok(specs.every(spec => spec.panel.layout === "matches" && !("feedbackAt" in spec)));
    assert.equal(specs[0].panel.options.length, variant === "dual" ? 2 : 1);
    assert.equal(result.stimulusSet, ["dual", "audio"].includes(variant) ? "speech-words-en" :
      variant === "arithmetic" ? "digits" : "spatial");
    await ctx.close();
  }
});
