"use strict";

(() => {
  const C = window.Cortex, S = C.Stats;
  const sources = {
    span: ["Unsworth et al. (2005)", "An automated version of the operation span task", "10.3758/BF03192720"],
    running: ["Jahanshahi et al. (2008)", "A preliminary investigation of the running digit span as a test of working memory", "10.3233/BEN-2008-0212"],
    nback: ["Jaeggi et al. (2008)", "Improving fluid intelligence with training on working memory", "10.1073/pnas.0801268105"],
    ufov: ["Ball et al. (1988)", "Age and visual search: expanding the useful field of view", "10.1364/JOSAA.5.002210"],
    reliability: ["Hedge et al. (2018)", "The reliability paradox: Why robust cognitive tasks do not produce reliable individual differences", "10.3758/s13428-017-0935-1"],
    antisaccade: ["Meier et al. (2018)", "Working memory capacity and the antisaccade task: A microanalytic-macroanalytic investigation of individual differences in goal activation and maintenance", "10.1037/xlm0000431"],
    arrays: ["Luck & Vogel (1997)", "The capacity of visual working memory for features and conjunctions", "10.1038/36846"],
    corsi: ["Kessels et al. (2000)", "The Corsi Block-Tapping Task: standardization and normative data", "10.1207/S15324826AN0704_8"],
    digits: ["Woods et al. (2011)", "Improving digit span assessment of short-term verbal memory", "10.1080/13803395.2010.493149"],
    reasoning: ["Carpenter et al. (1990)", "What one intelligence test measures: a theoretical account of the processing in the Raven Progressive Matrices Test", "10.1037/0033-295X.97.3.404"],
    speed: ["Salthouse (1996)", "The processing-speed theory of adult age differences in cognition", "10.1037/0033-295X.103.3.403"],
    pvt: ["Basner et al. (2011)", "Validity and Sensitivity of a Brief Psychomotor Vigilance Test (PVT-B) to Total and Partial Sleep Deprivation", "10.1016/j.actaastro.2011.07.015"],
    sternberg: ["Sternberg (1966)", "High-speed scanning in human memory", "10.1126/science.153.3736.652"],
    pairs: ["Cleary et al. (2001)", "Memory for detail in item versus associative recognition", "10.3758/BF03196392"],
    loci: ["Dresler et al. (2017)", "Mnemonic Training Reshapes Brain Networks to Support Superior Memory", "10.1016/j.neuron.2017.02.003"],
    stop: ["Verbruggen et al. (2019)", "A consensus guide to capturing the ability to inhibit actions and impulsive behaviors in the stop-signal task", "10.7554/eLife.46323"],
    control: ["Braver (2012)", "The variable nature of cognitive control: a dual mechanisms framework", "10.1016/j.tics.2011.12.010"],
    switching: ["Rogers & Monsell (1995)", "Costs of a predictable switch between simple cognitive tasks", "10.1037/0096-3445.124.2.207"],
    symbols: ["Salthouse (1992)", "What do adult age differences in the Digit Symbol Substitution Test reflect?", "10.1093/geronj/47.3.P121"],
    rotation: ["Shepard & Metzler (1971)", "Mental rotation of three-dimensional objects", "10.1126/science.171.3972.701"],
    tower: ["Shallice (1982)", "Specific impairments of planning", "10.1098/rstb.1982.0082"],
    forecast: ["Gneiting & Raftery (2007)", "Strictly proper scoring rules, prediction, and estimation", "10.1198/016214506000001437"],
    timing: ["Bridges et al. (2020)", "The timing mega-study: Comparing a range of experiment generators, both lab-based and online", "10.7717/peerj.9414"],
    transfer: ["Simons et al. (2016)", "Do \"Brain-Training\" Programs Work?", "10.1177/1529100616661983"]
  };
  const families = {
    "symmetry-span": ["complex", ["span"]], "operation-span": ["complex", ["span"]],
    "running-span": ["running", ["running"]], "dual-nback": ["nback", ["nback"]],
    ufov: ["ufov", ["ufov"]],
    "stroop-squared": ["conflict", ["reliability"]], "flanker-squared": ["conflict", ["reliability"]],
    "simon-squared": ["conflict", ["reliability"]],
    antisaccade: ["antisaccade", ["antisaccade"]], "visual-arrays": ["arrays", ["arrays"]],
    corsi: ["corsi", ["corsi"]], "digit-span": ["digits", ["digits"]],
    "matrix-reasoning": ["reasoning", ["reasoning"]], "number-series": ["reasoning", ["reasoning"]],
    "mental-arithmetic": ["arithmetic", ["speed"]], "pvt-b": ["pvt", ["pvt"]],
    sternberg: ["sternberg", ["sternberg"]], "paired-associates": ["pairs", ["pairs"]],
    "method-loci": ["loci", ["loci"]], "stop-signal": ["stop", ["stop"]],
    "ax-cpt": ["control", ["control"]], "task-switching": ["switching", ["switching"]],
    "digit-symbol": ["symbols", ["symbols"]], "mental-rotation": ["rotation", ["rotation"]],
    "tower-london": ["tower", ["tower"]], forecasting: ["forecast", ["forecast"]]
  };
  C.Evidence = { sources, families };

  C.seriesKey = (task, session) => C.canonical({
    params: session.params, device: session.deviceClass, input: session.inputMethod,
    language: task.languageDependent ? session.language : "neutral", stimulusSet: session.stimulusSet,
    protocol: session.protocolVersion || 1, orientation: C.layoutOrientation(session.viewport),
    processingDeadlineMs: session.processingDeadlineMs ?? null
  });
  const key = (task, session) => `${session.mode}|${C.seriesKey(task, session)}`;
  const directions = Object.fromEntries([
    ["higher", ["span", "partialCreditLoad", "nLevelMean", "correctPerMinute", "correctPer90", "meanReciprocalRT",
      "estimatedThreshold", "accuracy", "dPrime", "k4", "k6", "k8", "kMean", "goAccuracy",
      "switchAccuracy", "repeatAccuracy", "optimalSolutions", "optimalMoveEfficiency"]],
    ["lower", ["centralThreshold", "dividedThreshold", "selectiveThreshold", "ssrt", "meanRT", "meanBrier"]]
  ].flatMap(([direction, metrics]) => metrics.map(metric => [metric, direction])));
  const contextMetrics = ["accuracy", "processingAccuracy", "meanRT", "lapses", "falseStarts", "nLevelMean", "span", "partialCreditLoad",
    "pairLoadMean", "goAccuracy", "stopResponseRate", "meanExcessMoves", "optimalMoveEfficiency"];
  const compare = (a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const eligible = sessions => {
    // Conflicting backup variants are not independent attempts, including the original they refer to.
    const conflicts = new Set(sessions.filter(row => row.importSourceId).map(row => row.importSourceId));
    return sessions.filter(row => !row.invalid && !row.practiceOnly && row.completedMain !== false &&
      !row.importSourceId && !conflicts.has(row.id) && ["training", "assessment"].includes(row.mode) &&
      Number.isFinite(Date.parse(row.startedAt)));
  };
  function groups(task, sessions, mode, device, input) {
    const map = new Map();
    for (const row of eligible(sessions).filter(row => row.taskId === task.id && row.mode === mode &&
      row.deviceClass === device && row.inputMethod === input).sort(compare)) {
      const id = key(task, row);
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(row);
    }
    return [...map.entries()].map(([id, rows]) => ({ key: id, rows, anchor: rows.at(-1) }))
      .sort((a, b) => compare(b.anchor, a.anchor));
  }
  function summarize(task, sessions, anchor, metric = task.primaryMetric) {
    if (!directions[metric]) throw new RangeError(`Unsupported progress metric: ${metric}`);
    if (anchor && !Number.isFinite(Date.parse(anchor.startedAt))) throw new RangeError("Invalid progress anchor date");
    const setup = anchor ? key(task, anchor) : null;
    const all = anchor ? eligible(sessions).filter(row => row.taskId === task.id && key(task, row) === setup &&
      compare(row, anchor) <= 0).sort(compare) : [];
    const rows = all.filter(row => Number.isFinite(row.score?.[metric]));
    const count = rows.length, baselineRows = count >= 3 ? rows.slice(0, 3) : [];
    const recentRows = count >= 6 ? rows.slice(-3) : [];
    const median = (window, field) => window.length === 3 && window.every(row => Number.isFinite(row.score?.[field])) ?
      S.median(window.map(row => row.score[field])) : null;
    const baseline = median(baselineRows, metric), recent = median(recentRows, metric);
    const delta = recent !== null && baseline !== null ? recent - baseline : null;
    const movement = delta === null ? null : Math.abs(delta) < 1e-10 ? "unchanged" : delta > 0 ? "higher" : "lower";
    return {
      metric, direction: directions[metric], setup, count, total: all.length,
      status: count < 3 ? "baseline" : count < 6 ? "established" : "review",
      remaining: Math.max(0, (count < 3 ? 3 : 6) - count),
      latest: count ? rows.at(-1).score[metric] : null,
      baseline, recent, delta, movement,
      baselineIds: baselineRows.map(row => row.id), recentIds: recentRows.map(row => row.id),
      baselineDates: baselineRows.map(row => row.startedAt), recentDates: recentRows.map(row => row.startedAt),
      range: recentRows.length ? [Math.min(...recentRows.map(row => row.score[metric])),
        Math.max(...recentRows.map(row => row.score[metric]))] : null,
      context: recentRows.length ? contextMetrics.filter(field => field !== metric &&
        [...baselineRows, ...recentRows].some(row => field in row.score)).map(field => ({
          metric: field, baseline: median(baselineRows, field), recent: median(recentRows, field)
        })) : []
    };
  }
  C.Progress = { key, groups, summarize, directions };
})();
