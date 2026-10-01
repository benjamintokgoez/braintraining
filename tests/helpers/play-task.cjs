"use strict";

function playTask(f, ctx, { practice = false, falseStarts = false, responseMode = "correct", latency = 208 } = {}) {
  ctx.phase = practice ? "practice" : "block";
  let spec = null, frames = 0;
  const originalTrial = ctx.trial.bind(ctx), selections = new WeakMap();
  ctx.trial = async next => {
    spec = next;
    return originalTrial(next);
  };
  f.env.onFrame = time => {
    if (++frames > 250000) throw new Error(`Task exceeded virtual-frame budget: ${ctx.task.id}`);
    const current = ctx.current;
    if (!current) return;
    if (current.falseStartPhase) {
      if (falseStarts && !selections.has(current)) {
        selections.set(current, true);
        ctx.respond(0, ctx.input);
      }
      return;
    }
    if (time - current.startedAt < latency || current.done || current.responseEnabled === false) return;
    const mode = typeof responseMode === "function" ? responseMode(current) : responseMode;
    if (mode === "omit") return;
    if (current.multi) {
      const meta = current.trial;
      if (meta.usePosition && (mode === "wrong" ? !meta.positionTarget : meta.positionTarget)) ctx.respond(0, ctx.input);
      if (meta.useAudio && (mode === "wrong" ? !meta.audioTarget : meta.audioTarget)) ctx.respond(1, ctx.input);
    } else if (current.interact) {
      if (mode === "wrong") return;
      const move = current.trial.optimalPath[current.responses.length];
      if (!move) throw new Error("Missing optimal Tower move");
      const sourceSelected = selections.get(current) || false;
      ctx.respond((sourceSelected ? move.to : move.from) - 1, ctx.input);
      selections.set(current, !sourceSelected);
    } else if (current.sequence) {
      const meta = current.trial;
      const expected = meta.expected || meta.sequence || String(meta.answer).split("")
        .map(value => /^\d$/.test(value) ? Number(value) : value);
      let value = current.responses.length < expected.length ? expected[current.responses.length] : "done";
      if (mode === "wrong" && !current.responses.length) {
        value = current.options.find(option => option.value !== value && !["back", "done"].includes(option.value)).value;
      }
      ctx.respond(value, ctx.input);
    } else if (mode === "wrong" || !current.trial.stopTrial) {
      if (spec.answer === undefined) throw new Error(`No response plan for ${ctx.task.id}`);
      if (mode === "wrong") {
        const alternative = current.options.find(option => option.value !== spec.answer);
        if (current.trial.stopTrial) ctx.respond(spec.answer, ctx.input);
        else if (alternative) ctx.respond(alternative.value, ctx.input);
      } else ctx.respond(spec.answer, ctx.input);
    }
  };
  return ctx.task.run(ctx);
}

module.exports = { playTask };
