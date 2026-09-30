"use strict";

function session(f, overrides = {}) {
  const task = f.C.Tasks.find(entry => entry.id === (overrides.taskId || "flanker-squared"));
  return {
    id: "round-1", taskId: task.id, mode: "training", startedAt: f.C.iso(), durationMs: 90000,
    params: { ...task.params }, language: "en", deviceClass: "desktop", inputMethod: "keyboard",
    refreshHz: 60, viewport: { width: 1024, height: 768, dpr: 1 }, invalid: false, invalidReasons: [],
    score: { accuracy: .9, correct: 90, correctPer90: 90 }, practiceOnly: false, practiceCount: 8,
    protocolVersion: 2, splitHalf: null, stimulusSet: "visual", ...overrides
  };
}

module.exports = { session };
