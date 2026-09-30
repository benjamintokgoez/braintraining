"use strict";

(() => {
  const C = window.Cortex;
  const profiles = {
    "flanker-squared": { blocks: 1 },
    "simon-squared": { blocks: 1 },
    "digit-symbol": { durationSeconds: 90 },
    "task-switching": { blocks: 1, trialsPerBlock: 40 },
    "dual-nback": { variant: "position", blocks: 2 },
    "digit-span": { startLength: 2, maxLength: 8 },
    "running-span": { trials: 12 },
    "number-series": { trials: 25, responseMs: 15000 },
    "mental-rotation": { trials: 42 },
    "tower-london": { trials: 12 },
    "mental-arithmetic": { durationSeconds: 240 },
    "paired-associates": { blocks: 3, recognitionRepeats: 2 }
  };
  const taskById = id => C.Tasks.find(task => task.id === id);
  const isDone = routine => routine.steps.every(step => step.sessionId || step.skipped);
  const practiceKey = (task, params, mode = "training") => C.canonical({
    task: task.id, params, mode, device: C.device(), input: C.input,
    language: task.languageDependent ? C.language : "neutral", protocol: 2
  });
  const matchEvidence = (task, params, rows) => task.id !== "dual-nback" ||
    (params.variant === "audio" || rows.some(row => row.positionTarget && row.response?.includes(0))) &&
    (!["audio", "dual"].includes(params.variant) || rows.some(row => row.audioTarget && row.response?.includes(1)));
  const current = () => {
    const routine = C.Storage.getRoutine();
    if (!routine || routine.date !== C.today()) return null;
    if (routine.steps.some(step => !taskById(step.taskId) || C.parameterError(taskById(step.taskId), step.params))) {
      C.notice?.("routine.invalid");
      return null;
    }
    return routine;
  };
  const build = minutes => {
    if (![10, 15, 20].includes(minutes)) throw new RangeError("Routine budget must be 10, 15 or 20 minutes");
    const day = Math.floor(Date.parse(`${C.today()}T12:00:00Z`) / 86400000);
    const groups = [
      { ids: ["flanker-squared", "simon-squared", "digit-symbol", "task-switching"] },
      { ids: ["dual-nback", "digit-span", "running-span"] },
      { ids: ["number-series", "mental-rotation", "tower-london", "mental-arithmetic"] }
    ];
    if (minutes >= 15) groups.push({ ids: ["pvt-b"] });
    if (minutes >= 20) groups.push({ ids: ["paired-associates"] });
    const steps = groups.map((group, index) => {
      const taskId = group.ids[(day + index) % group.ids.length];
      const task = taskById(taskId);
      const params = { ...task.params, ...profiles[taskId] };
      const error = C.parameterError(task, params);
      if (error) throw new Error(error);
      return { taskId, params, estimatedMinutes: C.Routine.estimateMinutes(task, params), sessionId: null, skipped: false, lastAttemptId: null };
    });
    return { id: C.uid(), date: C.today(), createdAt: C.iso(), completedAt: null, minutes, steps };
  };
  C.Routine = {
    current, build, isDone, practiceKey,
    preview: () => current() || build(C.Storage.getSettings().routineMinutes),
    start() {
      const routine = current() || build(C.Storage.getSettings().routineMinutes);
      C.Storage.setRoutine(routine);
      return routine;
    },
    next(routine = current()) {
      if (!routine) return null;
      const index = routine.steps.findIndex(step => !step.sessionId && !step.skipped);
      return index < 0 ? null : { routine, index, step: routine.steps[index], task: taskById(routine.steps[index].taskId) };
    },
    withSession(summary) {
      const routine = current();
      if (!routine || summary.routineId !== routine.id) return undefined;
      const step = routine.steps[summary.routineStep];
      if (!step || step.taskId !== summary.taskId || C.canonical(step.params) !== C.canonical(summary.params)) {
        throw new Error("routine.invalid");
      }
      step.lastAttemptId = summary.id;
      if (C.completedRound(summary)) step.sessionId = summary.id;
      if (isDone(routine)) routine.completedAt = C.iso();
      return routine;
    },
    skip() {
      const next = this.next();
      if (!next) throw new Error("routine.invalid");
      next.step.skipped = true;
      if (isDone(next.routine)) next.routine.completedAt = C.iso();
      return C.Storage.setRoutine(next.routine);
    },
    canSkipPractice(task, params, mode = "training") {
      if (mode !== "training" || C.Storage.getSettings().warmupPolicy === "always") return false;
      const ready = C.Storage.getSettings().practiceReady[practiceKey(task, params, mode)];
      if (C.validTimestamp(ready)) return true;
      return C.Storage.getSessions(task.id, { mode: "training", deviceClass: C.device(), inputMethod: C.input })
        .some(session => C.completedRound(session) && session.protocolVersion === 2 &&
          session.practiceCount >= 8 && session.score.accuracy >= .6 &&
          (!task.languageDependent || session.language === C.language) && C.canonical(session.params) === C.canonical(params) &&
          matchEvidence(task, params, task.id === "dual-nback" ?
            C.Stats.eligible(C.Stats.exclude(C.Storage.getTrials(session.id))) : []));
    },
    recordPractice(ctx) {
      ctx.practiceCompleted = true;
      if (ctx.mode !== "training" || ctx.invalid && !C.onlyTimingWarning(ctx.reasons) || ctx.signal.aborted ||
        C.practiceCount(ctx.practiceTrials.filter(row => !row.falseStart)) < 8 ||
        (C.Stats.accuracy(C.Stats.exclude(ctx.practiceTrials)) ?? 0) < .6 ||
        !matchEvidence(ctx.task, ctx.params, C.Stats.eligible(C.Stats.exclude(ctx.practiceTrials)))) return;
      const ready = C.Storage.getSettings().practiceReady;
      ready[practiceKey(ctx.task, ctx.params)] = C.iso();
      C.Storage.setSettings({ practiceReady: ready });
    },
    estimateMinutes(task, params) {
      if (task.kind === "journal") return null;
      if (params.durationSeconds) return Math.ceil(params.durationSeconds * (params.blocks || 1) / 60);
      if (task.id === "dual-nback") return Math.ceil((20 + params.n) *
        (params.stimulusMs + params.isiMs + 250) * params.blocks / 60000);
      if (["corsi", "digit-span"].includes(task.id)) return Math.ceil(
        (params.maxLength - params.startLength + 1) * 2 * ((params.maxLength + params.startLength) / 2 + 5) / 60);
      if (task.id === "symmetry-span" || task.id === "operation-span") return 6;
      if (task.id === "ufov") return Math.ceil(params.trialsPerSubtest * 3 * 3 / 60);
      if (task.id === "paired-associates") return Math.ceil(params.pairs * params.blocks *
        (params.studyMs + params.responseMs * .6 * 2 * params.recognitionRepeats) / 60000);
      if (task.id === "running-span") return Math.ceil(params.trials * (1000 +
        (params.minStreamLength + params.maxStreamLength) / 2 * params.presentationMs +
        Math.min(params.recallMs, ((params.recallLength + params.maxRecall) / 2 + 1) * 600) + 250) / 60000);
      const count = params.trials || params.trialsPerBlock * params.blocks || 1;
      const seconds = (params.responseMs || params.recallMs || 3000) / 1000 * .6 +
        (params.studyMs || params.cueTargetIntervalMs || params.retentionMs || 500) / 1000;
      return Math.max(1, Math.ceil(count * seconds / 60));
    }
  };
})();
