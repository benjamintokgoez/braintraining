(() => {
  const C = window.Cortex, D = C.Draw, S = C.Stats, { p } = C.parameter;
  const PRACTICE_TRIALS = 8;
  const TWO_KEYS = ["a", "l"];
  const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const SWITCH_DIGITS = [1, 2, 3, 4, 6, 7, 8, 9];
  const FIXATION_MS = 250;
  const isFiniteNumber = Number.isFinite;
  const finiteMean = values => S.mean(values.filter(isFiniteNumber));
  const response0 = row => Array.isArray(row.response) ? row.response[0] : undefined;
  const omitted = row => !Array.isArray(row.response) || row.response.length === 0;
  const normalizedRows = rows => rows.some(row => row && typeof row === "object" && "excluded" in row) ? rows : S.exclude(rows);
  const stackScenes = (top, bottom, gap = 12, width = Math.max(top.width || 420, bottom.width || 420, 420)) => ({
    width,
    height: (top.height || 0) + gap + (bottom.height || 0),
    layers: [
      { scene: top, x: (width - (top.width || width)) / 2, y: 0, width: top.width || width, height: top.height || 0 },
      { scene: bottom, x: (width - (bottom.width || width)) / 2, y: (top.height || 0) + gap,
        width: bottom.width || width, height: bottom.height || 0 }
    ]
  });
  const hashText = text => {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `m${(hash >>> 0).toString(36)}`;
  };
  const allocateWeighted = (total, weights) => {
    const rows = weights.map(entry => {
      const raw = total * entry.weight;
      const count = Math.floor(raw);
      return { ...entry, raw, count, remainder: raw - count };
    });
    let remaining = total - rows.reduce((sum, row) => sum + row.count, 0);
    rows.sort((a, b) => b.remainder - a.remainder || String(a.key).localeCompare(String(b.key)));
    for (let i = 0; i < remaining; i++) rows[i % rows.length].count++;
    return Object.fromEntries(rows.map(row => [row.key, row.count]));
  };
  const shuffledFlags = (count, share) => C.shuffle(Array.from({ length: count }, (_, i) => i < Math.round(count * share)));
  const cycleValues = (count, values) => {
    const out = [];
    while (out.length < count) out.push(...C.shuffle(values));
    return out.slice(0, count);
  };
  const accuracyScore = C.accuracyScore;
  const fixedOrAdaptiveDeadline = (ctx, practice, fixed, state, remaining = Infinity) =>
    Math.min(practice || ctx.mode === "assessment" ? fixed : state.state.value, remaining);

  function drawArrow(g, w, h, direction, stop = false) {
    const sign = direction === 0 ? -1 : 1;
    g.save();
    g.strokeStyle = D.palette["task-fg"];
    g.fillStyle = D.palette["task-fg"];
    g.lineWidth = 10;
    g.lineCap = "round";
    g.beginPath();
    g.moveTo(w / 2 - sign * 110, h / 2);
    g.lineTo(w / 2 + sign * 40, h / 2);
    g.stroke();
    g.beginPath();
    g.moveTo(w / 2 + sign * 92, h / 2);
    g.lineTo(w / 2 + sign * 34, h / 2 - 38);
    g.lineTo(w / 2 + sign * 34, h / 2 + 38);
    g.closePath();
    g.fill();
    if (stop) {
      g.strokeStyle = D.palette["stim-red"];
      g.lineWidth = 8;
      g.beginPath();
      g.arc(w / 2, h / 2, 64, 0, Math.PI * 2);
      g.stroke();
      g.beginPath();
      g.moveTo(w / 2 - 45, h / 2 - 45);
      g.lineTo(w / 2 + 45, h / 2 + 45);
      g.stroke();
    }
    g.restore();
  }
  const arrowScene = (direction, stop = false) => D.scene((g, w, h) => drawArrow(g, w, h, direction, stop), 420, 160);
  const centeredTextScene = (key, size = 30, color) => D.text(C.t(key), size, color);

  const stopPlan = (count, stopShare) => {
    const directions = C.shuffle(Array.from({ length: count }, (_, i) => i < Math.ceil(count / 2) ? 0 : 1));
    const stopFlags = shuffledFlags(count, stopShare);
    return directions.map((direction, index) => ({ direction, stopTrial: stopFlags[index] }));
  };
  const axPlan = (count, axShare) => {
    const counts = allocateWeighted(count, [
      { key: "AX", weight: axShare },
      { key: "AY", weight: (1 - axShare) / 3 },
      { key: "BX", weight: (1 - axShare) / 3 },
      { key: "BY", weight: (1 - axShare) / 3 }
    ]);
    return C.shuffle(Object.entries(counts).flatMap(([condition, n]) => Array.from({ length: n }, () => condition)))
      .map(condition => ({ condition, cue: condition[0], probe: condition[1], isTarget: condition === "AX" }));
  };
  const switchRules = (count, switchProbability) => {
    if (!count) return [];
    const switches = C.shuffle(Array.from({ length: count - 1 }, (_, i) => i < Math.round((count - 1) * switchProbability)));
    const rules = [Math.random() < .5 ? "parity" : "magnitude"];
    for (const change of switches) rules.push(change ? (rules.at(-1) === "parity" ? "magnitude" : "parity") : rules.at(-1));
    return rules;
  };
  const switchAnswer = (rule, digit) => rule === "parity" ? digit % 2 ? 0 : 1 : digit < 5 ? 0 : 1;
  const ruleCondition = rule => rule === "parity" ? "parity" : "magnitude";
  const switchPracticeItems = () => {
    const rules = ["parity", "parity", "magnitude", "magnitude", "parity", "magnitude", "parity", "magnitude"];
    const digits = [1, 8, 3, 6, 7, 2, 9, 4];
    return rules.map((rule, index) => ({
      rule, digit: digits[index], previousRule: index ? rules[index - 1] : null,
      switch: index ? rules[index] !== rules[index - 1] : null, answer: switchAnswer(rule, digits[index])
    }));
  };
  const mappingCode = pairs => pairs.map(({ digit, glyphId }) => `${digit}:${glyphId}`).join("|");
  const glyphs = [
    { id: "hook", strokes: [[[.2,.2],[.75,.2],[.75,.62],[.42,.82]]], dots: [[.24,.72]] },
    { id: "fork", strokes: [[[.2,.78],[.5,.2],[.8,.78]], [[.5,.2],[.5,.84]]], dots: [[.76,.32]] },
    { id: "kite", strokes: [[[.5,.16],[.82,.46],[.5,.84],[.18,.46],[.5,.16]], [[.18,.46],[.82,.46]]], dots: [[.26,.24]] },
    { id: "step", strokes: [[[.2,.26],[.62,.26],[.62,.5],[.38,.5],[.38,.74],[.8,.74]]], dots: [[.18,.7]] },
    { id: "spear", strokes: [[[.22,.78],[.74,.26],[.54,.26],[.78,.18],[.7,.42]]], dots: [[.3,.26]] },
    { id: "arch", strokes: [[[.18,.74],[.18,.42],[.5,.18],[.82,.42],[.82,.74]], [[.34,.74],[.66,.74]]], dots: [[.72,.28]] },
    { id: "loop", strokes: [[[.3,.22],[.7,.22],[.7,.58],[.46,.58],[.46,.82],[.82,.82]]], dots: [[.24,.5]] },
    { id: "rake", strokes: [[[.24,.18],[.24,.82]], [[.24,.26],[.76,.26]], [[.24,.5],[.64,.5]], [[.24,.74],[.84,.74]]], dots: [[.76,.12]] },
    { id: "zig", strokes: [[[.18,.24],[.58,.24],[.34,.52],[.76,.52],[.42,.82]]], dots: [[.16,.7]] }
  ];
  const glyphById = new Map(glyphs.map(glyph => [glyph.id, glyph]));
  function drawGlyph(g, glyph, x, y, size, color = D.palette["task-fg"]) {
    const unit = size;
    g.save();
    g.translate(x, y);
    g.strokeStyle = color;
    g.fillStyle = color;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.lineWidth = Math.max(2, size * .08);
    for (const stroke of glyph.strokes) {
      g.beginPath();
      stroke.forEach(([px, py], index) => {
        const xx = (px - .5) * unit;
        const yy = (py - .5) * unit;
        if (!index) g.moveTo(xx, yy);
        else g.lineTo(xx, yy);
      });
      g.stroke();
    }
    for (const [px, py] of glyph.dots || []) {
      g.beginPath();
      g.arc((px - .5) * unit, (py - .5) * unit, Math.max(3, unit * .06), 0, Math.PI * 2);
      g.fill();
    }
    g.restore();
  }
  const makeDigitSymbolMapping = () => {
    const glyphOrder = C.shuffle(glyphs.map(glyph => glyph.id));
    const pairs = DIGITS.map((digit, index) => ({ digit, glyphId: glyphOrder[index] }));
    const code = mappingCode(pairs);
    return {
      pairs,
      code,
      hash: hashText(code),
      digitToGlyph: new Map(pairs.map(pair => [pair.digit, glyphById.get(pair.glyphId)]))
    };
  };
  const digitSymbolLookupScene = mapping => D.scene((g, w, h) => {
    g.fillStyle = D.palette["task-fg"];
    g.font = '600 22px "Segoe UI", Aptos, Calibri, sans-serif';
    g.fillText(C.t("stim.digitSymbol.lookup"), w / 2, 18, w - 24);
    const top = 34, cell = 112, startX = (w - cell * 3) / 2;
    mapping.pairs.forEach((pair, index) => {
      const col = index % 3, row = Math.floor(index / 3);
      const x = startX + col * cell, y = top + row * 54;
      g.fillStyle = D.palette["task-panel"];
      g.strokeStyle = D.palette["stim-gray"];
      g.lineWidth = 1.5;
      g.fillRect(x + 3, y + 3, cell - 6, 48);
      g.strokeRect(x + 3, y + 3, cell - 6, 48);
      g.fillStyle = D.palette["task-fg"];
      g.font = '600 16px "Segoe UI", Aptos, Calibri, sans-serif';
      g.fillText(C.number(pair.digit, 0), x + 22, y + 24);
      drawGlyph(g, glyphById.get(pair.glyphId), x + 72, y + 26, 34);
    });
  }, 420, 205);
  const digitSymbolTargetScene = (mapping, digit) => D.scene((g, w, h) => {
    g.fillStyle = D.palette["task-fg"];
    g.font = '600 22px "Segoe UI", Aptos, Calibri, sans-serif';
    g.fillText(C.t("stim.digitSymbol.target"), w / 2, 20, w - 24);
    g.strokeStyle = D.palette["stim-blue"];
    g.lineWidth = 2;
    g.strokeRect(w / 2 - 70, 36, 140, 88);
    drawGlyph(g, mapping.digitToGlyph.get(digit), w / 2, 82, 78, D.palette["stim-blue"]);
  }, 420, 132);

  S.ssrt = (rows, params = {}) => {
    const valid = S.eligible(normalizedRows(rows));
    const go = valid.filter(row => !row.stopTrial);
    const stop = valid.filter(row => row.stopTrial);
    const goOmissions = go.filter(row => !isFiniteNumber(row.rtMs)).length;
    const goAccuracy = go.length ? go.filter(row => row.correct).length / go.length : null;
    const stopAccuracy = stop.length ? stop.filter(row => omitted(row)).length / stop.length : null;
    const stopResponseRate = stop.length ? stop.filter(row => !omitted(row)).length / stop.length : null;
    const goMeanRT = finiteMean(go.filter(row => row.correct).map(row => row.rtMs));
    const failedStopMeanRT = finiteMean(stop.filter(row => !omitted(row)).map(row => row.rtMs));
    const meanSSD = stop.length && stop.every(row => isFiniteNumber(row.actualSsdMs)) ?
      finiteMean(stop.map(row => row.actualSsdMs)) : null;
    let ssrt = null;
    let reasonKey = null;
    if (go.length < 20) reasonKey = "score.ssrtReason.minGo";
    else if (stop.length < 8) reasonKey = "score.ssrtReason.minStop";
    else if (goOmissions / go.length > .25) reasonKey = "score.ssrtReason.goOmissions";
    else if (!(stopResponseRate >= .25 && stopResponseRate <= .75)) reasonKey = "score.ssrtReason.stopRate";
    else if (!isFiniteNumber(goMeanRT) || !isFiniteNumber(failedStopMeanRT) || failedStopMeanRT >= goMeanRT) {
      reasonKey = "score.ssrtReason.race";
    } else if (!isFiniteNumber(meanSSD)) reasonKey = "score.ssrtReason.ssd";
    else {
      const goDistribution = go.map(row => isFiniteNumber(row.rtMs) ? row.rtMs :
        isFiniteNumber(row.deadlineMs) ? row.deadlineMs : params.responseMs).filter(isFiniteNumber).sort((a, b) => a - b);
      if (goDistribution.length !== go.length) reasonKey = "score.ssrtReason.distribution";
      else {
        const quantileIndex = C.clamp(Math.ceil(stopResponseRate * goDistribution.length) - 1, 0, goDistribution.length - 1);
        ssrt = goDistribution[quantileIndex] - meanSSD;
        if (!(ssrt > 0)) {
          ssrt = null;
          reasonKey = "score.ssrtReason.nonpositive";
        }
      }
    }
    return {
      ssrt,
      ssrtEstimable: Number(ssrt !== null),
      ssrtReasonKey: reasonKey,
      goAccuracy,
      stopAccuracy,
      stopResponseRate,
      meanSSD,
      goOmissions,
      meanGoRT: goMeanRT,
      failedStopMeanRT
    };
  };

  C.Tier2Attention = {
    PRACTICE_TRIALS,
    stopPlan,
    axPlan,
    switchRules,
    switchPracticeItems,
    switchAnswer,
    makeDigitSymbolMapping,
    mappingCode,
    hashText
  };

  C.define("stop-signal", "attention", {
    trials: p(64, 32, 240, 4),
    stopProbability: p(.25, .1, .5, .05),
    responseMs: p(1000, 300, 2500, 50),
    itiMs: p(800, 100, 3000, 50),
    ssdStartMs: p(250, 50, 900, 25),
    ssdMinMs: p(50, 0, 900, 25),
    ssdMaxMs: p(450, 100, 950, 25),
    ssdStepMs: p(50, 25, 200, 25)
  }, {
    tier: 2, primaryMetric: "ssrt",
    metrics: ["ssrt", "goAccuracy", "stopAccuracy", "stopResponseRate", "meanSSD", "accuracy"],
    staircase: "stopDelay",
    validateParams(q) {
      const cappedMax = Math.min(q.ssdMaxMs, q.responseMs - 25);
      return q.ssdMinMs > q.ssdStartMs || q.ssdStartMs > q.ssdMaxMs || cappedMax <= q.ssdMinMs || q.ssdMaxMs >= q.responseMs ?
        "stopSignal.invalidSsdRange" : null;
    },
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice";
      const title = centeredTextScene("stim.stopSignal.block");
      const fixation = D.text("+", 34);
      const panel = ctx.prepareOptions(D.options([C.t("response.left"), C.t("response.right")], TWO_KEYS));
      const goScenes = [arrowScene(0, false), arrowScene(1, false)];
      const stopScenes = [arrowScene(0, true), arrowScene(1, true)];
      const state = ctx.state("ssd", "stopDelay", {
        start: q.ssdStartMs,
        min: q.ssdMinMs,
        max: Math.min(q.ssdMaxMs, q.responseMs - 25),
        step: q.ssdStepMs
      });
      const items = practice ? stopPlan(PRACTICE_TRIALS, .25) : stopPlan(q.trials, q.stopProbability);
      await ctx.show(title, 1200);
      await ctx.countdown();
      for (const item of items) {
        const requestedSsdMs = item.stopTrial ? C.clamp(practice || ctx.mode === "assessment" ? q.ssdStartMs : state.state.value,
          q.ssdMinMs, Math.min(q.ssdMaxMs, q.responseMs - 25)) : null;
        const row = await ctx.trial({
          phases: [{ scene: fixation, ms: FIXATION_MS }],
          scene: goScenes[item.direction],
          panel,
          deadline: q.responseMs,
          waitFullWindow: !!item.stopTrial,
          meta: {
            condition: `${item.stopTrial ? "stop" : "go"}-${item.direction ? "right" : "left"}`,
            stopTrial: item.stopTrial,
            direction: item.direction,
            requestedSsdMs,
            deadlineMs: q.responseMs
          },
          answer: item.direction,
          evaluate: response => item.stopTrial ? response.length === 0 : response[0] === item.direction,
          onset: trial => { trial.goOnset = trial.responseWindowOnset; },
          timeline: item.stopTrial ? [{
            atMs: requestedSsdMs,
            scene: stopScenes[item.direction],
            onset: (trial, actualFrameTime) => {
              trial.stopSignalOnset = actualFrameTime;
              trial.actualSsdMs = actualFrameTime - trial.responseWindowOnset;
            }
          }] : [],
          enrich: trial => {
            trial.stopSuccess = item.stopTrial && omitted(trial);
            trial.failedStopRtMs = item.stopTrial && !omitted(trial) ? trial.rtMs : null;
            trial.goOmission = !item.stopTrial && !isFiniteNumber(trial.rtMs);
          }
        });
        if (item.stopTrial && !practice && ctx.mode === "training" && !(isFiniteNumber(row.rtMs) && row.rtMs < 150)) {
          ctx.adapt(state, { correct: row.stopSuccess });
        }
        if (q.itiMs > 0) await ctx.show(ctx.blank, q.itiMs);
      }
      return {};
    },
    score(rows, q) {
      return { ...accuracyScore(rows), ...S.ssrt(rows, q) };
    }
  });

  C.define("ax-cpt", "attention", {
    trials: p(80, 40, 240, 4),
    axShare: p(.7, .4, .9, .05),
    cueDurationMs: p(500, 200, 2000, 50),
    cueProbeDelayMs: p(900, 200, 3000, 50),
    probeDurationMs: p(250, 50, 1200, 25),
    responseMs: p(1500, 400, 5000, 50),
    itiMs: p(600, 100, 3000, 50)
  }, {
    tier: 2, primaryMetric: "dPrime",
    metrics: ["dPrime", "accuracy", "ayErrorRate", "bxErrorRate", "meanRT"],
    staircase: "deadline",
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice";
      const state = ctx.state("probe-deadline", "deadline", { start: q.responseMs, min: 400, max: 5000 });
      const title = centeredTextScene("stim.axCpt.block");
      const panel = ctx.prepareOptions(D.options([C.t("response.target"), C.t("response.nonTarget")], TWO_KEYS));
      const cueScenes = {
        A: D.text(C.t("stim.axCpt.cueA"), 66, D.palette["stim-blue"]),
        B: D.text(C.t("stim.axCpt.cueB"), 66, D.palette["stim-blue"])
      };
      const probeScenes = {
        X: D.text(C.t("stim.axCpt.probeX"), 74, D.palette["stim-green"]),
        Y: D.text(C.t("stim.axCpt.probeY"), 74, D.palette["stim-yellow"])
      };
      const items = practice ? C.shuffle(["AX", "AY", "BX", "BY", "AX", "AY", "BX", "BY"])
        .map(condition => ({ condition, cue: condition[0], probe: condition[1], isTarget: condition === "AX" }))
        : axPlan(q.trials, q.axShare);
      await ctx.show(title, 1200);
      await ctx.countdown();
      const recent = [];
      for (const item of items) {
        const deadline = fixedOrAdaptiveDeadline(ctx, practice, q.responseMs, state);
        const row = await ctx.trial({
          phases: [{ scene: cueScenes[item.cue], ms: q.cueDurationMs }, { scene: ctx.blank, ms: q.cueProbeDelayMs }],
          scene: probeScenes[item.probe],
          panel,
          visibleMs: q.probeDurationMs,
          deadline,
          answer: item.isTarget ? 0 : 1,
          meta: {
            condition: item.condition,
            cue: item.cue,
            probe: item.probe,
            isTarget: item.isTarget,
            deadlineMs: deadline
          }
        });
        recent.push(row);
        if (!practice && ctx.mode === "training" && recent.length === 10) {
          ctx.adapt(state, {
            accuracy: S.accuracy(S.exclude(recent)),
            fast: (S.median(recent.map(entry => entry.rtMs).filter(isFiniteNumber)) ?? Infinity) < deadline * .75
          });
          recent.length = 0;
        }
        if (q.itiMs > 0) await ctx.show(ctx.blank, q.itiMs);
      }
      return { stimulusSet: "letters" };
    },
    score(rows) {
      const valid = S.eligible(rows);
      const hits = valid.filter(row => row.isTarget && response0(row) === 0).length;
      const misses = valid.filter(row => row.isTarget && response0(row) !== 0).length;
      const falseAlarms = valid.filter(row => !row.isTarget && response0(row) === 0).length;
      const correctRejections = valid.filter(row => !row.isTarget && response0(row) === 1).length;
      const ay = valid.filter(row => row.condition === "AY");
      const bx = valid.filter(row => row.condition === "BX");
      return {
        ...accuracyScore(rows),
        hits,
        misses,
        falseAlarms,
        correctRejections,
        omissions: valid.filter(omitted).length,
        nonTargetOmissions: valid.filter(row => !row.isTarget && omitted(row)).length,
        ayErrors: ay.filter(row => !row.correct).length,
        bxErrors: bx.filter(row => !row.correct).length,
        ayErrorRate: ay.length ? ay.filter(row => !row.correct).length / ay.length : null,
        bxErrorRate: bx.length ? bx.filter(row => !row.correct).length / bx.length : null,
        dPrime: hits + misses && falseAlarms + correctRejections ? S.dPrime(hits, misses, falseAlarms, correctRejections) : null,
        meanRT: finiteMean(valid.filter(row => row.correct).map(row => row.rtMs))
      };
    }
  });

  C.define("task-switching", "attention", {
    blocks: p(2, 1, 6),
    trialsPerBlock: p(40, 16, 80, 4),
    switchProbability: p(.35, .1, .9, .05),
    cueTargetIntervalMs: p(800, 200, 2500, 50),
    responseMs: p(1800, 500, 5000, 50),
    itiMs: p(500, 100, 2500, 50)
  }, {
    tier: 2, languageDependent: true, primaryMetric: "accuracy",
    metrics: ["accuracy", "switchAccuracy", "repeatAccuracy", "meanRT"],
    staircase: "deadline",
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice";
      const title = centeredTextScene("stim.taskSwitching.block");
      const state = ctx.state("switch-deadline", "deadline", { start: q.responseMs, min: 500, max: 5000 });
      const panels = {
        parity: ctx.prepareOptions(D.options([C.t("response.odd"), C.t("response.even")], TWO_KEYS)),
        magnitude: ctx.prepareOptions(D.options([C.t("response.low"), C.t("response.high")], TWO_KEYS))
      };
      const cueScenes = {
        parity: D.scene((g, w, h) => {
          g.fillStyle = D.palette["stim-blue"];
          g.font = '600 34px "Segoe UI", Aptos, Calibri, sans-serif';
          g.fillText(C.t("stim.taskSwitching.parityCue"), w / 2, 46, w - 24);
          g.fillStyle = D.palette["task-fg"];
          g.font = '500 20px "Segoe UI", Aptos, Calibri, sans-serif';
          g.fillText(C.t("stim.taskSwitching.parityLegend"), w / 2, 100, w - 30);
        }, 420, 145),
        magnitude: D.scene((g, w, h) => {
          g.fillStyle = D.palette["stim-yellow"];
          g.font = '600 34px "Segoe UI", Aptos, Calibri, sans-serif';
          g.fillText(C.t("stim.taskSwitching.magnitudeCue"), w / 2, 46, w - 24);
          g.fillStyle = D.palette["task-fg"];
          g.font = '500 20px "Segoe UI", Aptos, Calibri, sans-serif';
          g.fillText(C.t("stim.taskSwitching.magnitudeLegend"), w / 2, 100, w - 30);
        }, 420, 145)
      };
      const digitScenes = new Map();
      const itemScene = (rule, digit) => {
        const key = `${rule}:${digit}`;
        if (!digitScenes.has(key)) digitScenes.set(key, D.scene((g, w, h) => {
          g.fillStyle = D.palette[rule === "parity" ? "stim-blue" : "stim-yellow"];
          g.font = '600 26px "Segoe UI", Aptos, Calibri, sans-serif';
          g.fillText(C.t(rule === "parity" ? "stim.taskSwitching.parityCue" : "stim.taskSwitching.magnitudeCue"), w / 2, 30, w - 24);
          g.fillStyle = D.palette["task-fg"];
          g.font = '600 74px "Segoe UI", Aptos, Calibri, sans-serif';
          g.fillText(C.number(digit, 0), w / 2, 102, w - 24);
        }, 420, 150));
        return digitScenes.get(key);
      };
      const blocks = practice ? 1 : q.blocks;
      const recent = [];
      for (let block = 0; block < blocks; block++) {
        const items = practice ? switchPracticeItems() : (() => {
          const rules = switchRules(q.trialsPerBlock, q.switchProbability);
          const digits = cycleValues(q.trialsPerBlock, SWITCH_DIGITS);
          return rules.map((rule, index) => ({
            rule,
            digit: digits[index],
            previousRule: index ? rules[index - 1] : null,
            switch: index ? rules[index] !== rules[index - 1] : null,
            answer: switchAnswer(rule, digits[index])
          }));
        })();
        const prepared = items.map(item => ({
          ...item,
          cueScene: cueScenes[item.rule],
          panel: panels[item.rule],
          scene: itemScene(item.rule, item.digit)
        }));
        await ctx.show(title, 1000);
        await ctx.countdown();
        for (const item of prepared) {
          const deadline = fixedOrAdaptiveDeadline(ctx, practice, q.responseMs, state);
          const row = await ctx.trial({
            phases: [{ scene: item.cueScene, ms: q.cueTargetIntervalMs }],
            scene: item.scene,
            panel: item.panel,
            deadline,
            answer: item.answer,
            meta: {
              block,
              digit: item.digit,
              rule: item.rule,
              previousRule: item.previousRule,
              switch: item.switch,
              condition: `${ruleCondition(item.rule)}-${item.switch === null ? "first" : item.switch ? "switch" : "repeat"}`,
              deadlineMs: deadline
            }
          });
          recent.push(row);
          if (!practice && ctx.mode === "training" && recent.length === 10) {
            ctx.adapt(state, {
              accuracy: S.accuracy(S.exclude(recent)),
              fast: (S.median(recent.map(entry => entry.rtMs).filter(isFiniteNumber)) ?? Infinity) < deadline * .75
            });
            recent.length = 0;
          }
          if (q.itiMs > 0) await ctx.show(ctx.blank, q.itiMs);
        }
      }
      return { stimulusSet: "mixed" };
    },
    score(rows) {
      const valid = S.eligible(rows);
      const switches = valid.filter(row => row.switch === true);
      const repeats = valid.filter(row => row.switch === false);
      const parity = valid.filter(row => row.rule === "parity");
      const magnitude = valid.filter(row => row.rule === "magnitude");
      return {
        ...accuracyScore(rows),
        switchAccuracy: S.mean(switches.map(row => Number(row.correct))),
        repeatAccuracy: S.mean(repeats.map(row => Number(row.correct))),
        parityAccuracy: S.mean(parity.map(row => Number(row.correct))),
        magnitudeAccuracy: S.mean(magnitude.map(row => Number(row.correct))),
        meanRT: finiteMean(valid.filter(row => row.correct).map(row => row.rtMs))
      };
    }
  });

  C.define("digit-symbol", "processing-speed", {
    durationSeconds: p(90, 30, 240, 5),
    deadlineMs: p(2000, 400, 5000, 50)
  }, {
    tier: 2, primaryMetric: "correctPerMinute",
    metrics: ["correctPerMinute", "accuracy", "meanRT"],
    staircase: "deadline",
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice";
      const title = centeredTextScene("stim.digitSymbol.block");
      const panel = ctx.prepareOptions(DIGITS.map(digit => ({ value: digit, label: C.number(digit, 0), key: String(digit) })));
      const state = ctx.state("symbol-deadline", "deadline", { start: q.deadlineMs, min: 400, max: 5000 });
      const mapping = makeDigitSymbolMapping();
      const lookup = digitSymbolLookupScene(mapping);
      const targetScenes = Object.fromEntries(DIGITS.map(digit => [digit, digitSymbolTargetScene(mapping, digit)]));
      const fullScenes = Object.fromEntries(DIGITS.map(digit => [digit, stackScenes(lookup, targetScenes[digit])]));
      const recent = [];
      await ctx.show(title, 1200);
      await ctx.countdown();
      if (practice) {
        const practiceDigits = C.shuffle(DIGITS).slice(0, PRACTICE_TRIALS);
        for (const digit of practiceDigits) {
          const row = await ctx.trial({
            scene: fullScenes[digit],
            panel,
            deadline: q.deadlineMs,
            answer: digit,
            noFeedback: true,
            meta: {
              digit,
              glyphId: mapping.digitToGlyph.get(digit).id,
              mappingCode: mapping.code,
              mappingHash: mapping.hash,
              condition: `digit-${digit}`,
              deadlineMs: q.deadlineMs
            }
          });
          const feedbackMs = 150;
          if (feedbackMs > 0) await ctx.show(ctx.feedbackImages[Number(row.correct)], feedbackMs);
        }
      } else {
        const plannedDigits = cycleValues(90, DIGITS);
        const start = C.now();
        let index = 0;
        while (true) {
          const remaining = q.durationSeconds * 1000 - (C.now() - start);
          if (remaining <= 0) break;
          const digit = plannedDigits[index++ % plannedDigits.length];
          const fullDeadline = fixedOrAdaptiveDeadline(ctx, false, q.deadlineMs, state);
          const deadline = Math.min(fullDeadline, remaining);
          const row = await ctx.trial({
            scene: fullScenes[digit],
            panel,
            deadline,
            fullDeadline,
            answer: digit,
            noFeedback: true,
            meta: {
              digit,
              glyphId: mapping.digitToGlyph.get(digit).id,
              mappingCode: mapping.code,
              mappingHash: mapping.hash,
              condition: `digit-${digit}`,
              deadlineMs: deadline
            }
          });
          recent.push(row);
          if (ctx.mode === "training" && recent.length === 10) {
            ctx.adapt(state, {
              accuracy: S.accuracy(S.exclude(recent)),
              fast: (S.median(recent.map(entry => entry.rtMs).filter(isFiniteNumber)) ?? Infinity) < deadline * .75
            });
            recent.length = 0;
          }
          if (ctx.mode === "training") {
            const feedbackMs = Math.min(150, Math.max(0, q.durationSeconds * 1000 - (C.now() - start)));
            if (feedbackMs > 0) await ctx.show(ctx.feedbackImages[Number(row.correct)], feedbackMs);
          }
        }
      }
      return { stimulusSet: "symbols" };
    },
    score(rows, q) {
      const valid = S.eligible(rows);
      return {
        ...accuracyScore(rows),
        correctPerMinute: valid.filter(row => row.correct).length * 60 / q.durationSeconds,
        meanRT: finiteMean(valid.filter(row => row.correct).map(row => row.rtMs))
      };
    }
  });
})();
