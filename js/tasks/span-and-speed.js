(() => {
  const C = window.Cortex, D = C.Draw, S = C.Stats, { p, choice } = C.parameter;
  const gridKeys = ["1","2","3","4","5","6","7","8","9","q","w","e","r","t","y","u"];
  C.keypad = ctx => ctx.prepareOptions([
    ...[1,2,3,4,5,6,7,8,9,0].map(n => ({ value: n, label: C.number(n), key: String(n) })),
    { value: ".", label: C.t("response.decimal"), key: ctx.language === "de" ? "," : "." },
    { value: "-", label: "-", key: "-" },
    { value: "back", label: C.t("response.back"), key: "Backspace" },
    { value: "done", label: C.t("response.enter"), key: "Enter" }
  ]);
  C.digitRecallPanel = ctx => ctx.prepareOptions([
    ...Array.from({ length: 10 }, (_, i) => ({ value: i, label: String(i), key: String(i) })),
    { value: "back", label: C.t("response.back"), key: "Backspace" },
    { value: "done", label: C.t("response.enter"), key: "Enter" }
  ]);
  C.define("symmetry-span", "working-memory", { processingMs: p(3000, 500, 8000, 100),
    memoryMs: p(650, 300, 2000, 50), recallMs: p(20000, 5000, 60000, 1000) }, {
    landscape: true, primaryMetric: "partialCreditLoad", staircase: "deadline",
    async run(ctx) {
      const practice = ctx.phase === "practice", q = ctx.params;
      const processPanel = ctx.prepareOptions(D.options([C.t("response.symmetric"), C.t("response.asymmetric")], ["a","l"]));
      const recallPanel = ctx.prepareOptions(Array.from({ length: 16 }, (_, i) => ({
        value: i, label: gridKeys[i].toUpperCase(), key: gridKeys[i] })), "grid");
      const sizes = practice ? Array(8).fill(2) : C.shuffle([2,2,2,3,3,3,4,4,4,5,5,5]);
      const practiceRTs = ctx.practiceTrials.flatMap(row => row.processing || []).filter(row => row.correct && row.rtMs >= 150).map(row => row.rtMs);
      const calibrated = practiceRTs.length >= 4 ? C.clamp(S.mean(practiceRTs) * 2.5, 750, 8000) : q.processingMs;
      // Keep the assessment measuring stick fixed; calibration is used only for training.
      const deadline = practice || ctx.mode === "assessment" ? q.processingMs : calibrated;
      const items = sizes.map(length => ({
        length, sequence: C.shuffle(Array.from({ length: 16 }, (_, i) => i)).slice(0, length),
        patterns: Array.from({ length }, () => {
          const symmetric = Math.random() < .5;
          const bits = Array.from({ length: 64 }, () => false);
          for (let y = 0; y < 8; y++) for (let x = 0; x < 4; x++) bits[y * 8 + x] = bits[y * 8 + 7 - x] = Math.random() < .45;
          if (!symmetric) { const index = C.rand(0, 63); bits[index] = !bits[index]; }
          const scene = D.scene((g, w, h) => {
            for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
              g.fillStyle = bits[y * 8 + x] ? D.palette["task-fg"] : D.palette["task-panel"];
              g.fillRect(w / 2 - 100 + x * 25, h / 2 - 100 + y * 25, 23, 23);
            }
          }, 240, 240);
          return { symmetric, bits, scene };
        })
      }));
      const memories = Array.from({ length: 16 }, (_, i) => D.grid(4, [i]));
      await ctx.countdown();
      for (const item of items) {
        const processing = [];
        for (let i = 0; i < item.length; i++) {
          const row = await ctx.trial({ scene: item.patterns[i].scene, panel: processPanel, deadline,
            answer: item.patterns[i].symmetric ? 0 : 1, noRecord: true,
            meta: { symmetric: item.patterns[i].symmetric, pattern: item.patterns[i].bits } });
          processing.push(row);
          await ctx.show(memories[item.sequence[i]], q.memoryMs);
          await ctx.show(ctx.blank, 350);
        }
        await ctx.trial({ scene: ctx.blank, panel: recallPanel, sequence: true, maxLength: item.length, deadline: q.recallMs,
          displayResponse: value => gridKeys[value].toUpperCase(),
          meta: { length: item.length, sequence: item.sequence, processing, processingDeadlineMs: deadline },
          evaluate: response => response.length === item.length && response.every((n, i) => n === item.sequence[i]),
          enrich: row => { row.recallCorrect = row.response.filter((n, i) => n === item.sequence[i]).length;
            row.reliabilityValue = row.recallCorrect / item.length; }
        });
      }
      const rows = practice ? ctx.practiceTrials : ctx.trials;
      const processingAccuracy = S.processingAccuracy(rows);
      if (!practice && (processingAccuracy ?? 0) < .85) ctx.invalidate("runner.processing");
      return { processingDeadlineMs: deadline, score: { processingAccuracy } };
    },
    score(rows) {
      return { ...S.span(rows), processingAccuracy: S.processingAccuracy(rows) };
    }
  });

  for (const id of ["corsi", "digit-span"]) {
    C.define(id, "working-memory", { direction: choice(["forward","backward"]), startLength: p(2, 2, 8),
      maxLength: p(id === "corsi" ? 9 : 12, 3, id === "corsi" ? 9 : 16),
      flashMs: p(700, 300, 900, 50), intervalMs: p(1000, 1000, 2000, 100),
      recallMs: p(20000, 5000, 60000, 1000) }, {
      landscape: id === "corsi", primaryMetric: "span", metrics: ["span","partialCreditLoad"], staircase: "stepwise",
      async run(ctx) {
        const practice = ctx.phase === "practice", q = ctx.params, corsi = id === "corsi";
        const state = ctx.state("length", "stepwise", { start: q.startLength, min: 2, max: q.maxLength });
        const start = practice ? 2 : ctx.mode === "training" ? Math.round(state.state.value) : q.startLength;
        const panel = corsi ? ctx.prepareOptions(Array.from({ length: 9 }, (_, i) => ({
          value: i, label: String(i + 1), key: String(i + 1) })), "corsi") :
          C.digitRecallPanel(ctx);
        const flashes = corsi ? Array.from({ length: 9 }, (_, i) => {
          const canvas = document.createElement("canvas"); canvas.width = panel.canvas.width; canvas.height = panel.canvas.height;
          const g = canvas.getContext("2d"); g.drawImage(panel.canvas, 0, 0);
          const zone = panel.zones[i]; g.fillStyle = D.palette["stim-red"];
          g.fillRect(zone.x + 2, zone.y - panel.top + 2, zone.w - 4, zone.h - 4);
          return { ...panel, canvas };
        }) : Array.from({ length: 10 }, (_, i) => D.text(i));
        const count = practice ? 8 : Math.max(1, q.maxLength - start + 1) * 2;
        const items = Array.from({ length: count }, (_, i) => {
          const length = practice ? 2 : start + Math.floor(i / 2);
          const sequence = corsi ? C.shuffle([0,1,2,3,4,5,6,7,8]).slice(0, length) :
            Array.from({ length }, () => C.rand(0, 9));
          const expected = q.direction === "backward" ? [...sequence].reverse() : sequence;
          return { length, sequence, expected };
        });
        const titles = new Map(items.map(item => [item.length,
          D.text(C.t("stim.spanLevel", { length: C.number(item.length), direction: C.t(`choice.${q.direction}`) }), 30)]));
        await ctx.countdown();
        let pairCorrect = 0;
        for (let index = 0; index < items.length; index++) {
          const item = items[index];
          if (index % 2 === 0) await ctx.show(titles.get(item.length), 1200);
          for (const value of item.sequence) {
            await ctx.show(corsi ? ctx.blank : flashes[value], q.flashMs, corsi ? flashes[value] : null);
            await ctx.show(ctx.blank, q.intervalMs - q.flashMs, corsi ? panel : null);
          }
          const row = await ctx.trial({ scene: ctx.blank, panel, sequence: true, maxLength: corsi ? item.length : null, rtOnSubmit: !corsi,
            displayResponse: value => corsi ? value + 1 : value,
            deadline: q.recallMs, meta: { length: item.length, sequence: item.sequence, expected: item.expected, direction: q.direction },
            evaluate: response => response.length === item.length && response.every((n, i) => n === item.expected[i]),
            enrich: trial => { trial.recallCorrect = trial.response.filter((n, i) => n === item.expected[i]).length;
              trial.reliabilityValue = trial.recallCorrect / item.length; } });
          if (row.correct) pairCorrect++;
          if (!practice && index % 2 === 1) {
            ctx.adapt(state, { accuracy: pairCorrect / 2, up: .5, down: 0, downErrors: 2, errors: 2 - pairCorrect });
            if (!pairCorrect) break;
            pairCorrect = 0;
          }
        }
        return {};
      },
      score: rows => S.span(rows)
    });
  }

  C.define("mental-arithmetic", "reasoning", { minOperand: p(1, 0, 100), maxOperand: p(20, 2, 1000),
    operandCeiling: p(1000, 2, 1000),
    operations: choice(["mixed","add","subtract","multiply","divide"]), chained: choice(["yes","no"]),
    percentages: choice(["yes","no"]), durationSeconds: p(90, 30, 300, 10), deadlineMs: p(10000, 2000, 30000, 500) }, {
    primaryMetric: "correctPerMinute", staircase: "deadline", protocolVersion: 3,
    validateParams: q => q.maxOperand > q.operandCeiling ? "settings.rangeError" : null,
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice", panel = C.keypad(ctx);
      const magnitude = ctx.state("magnitude", "stepwise", { start: q.maxOperand, min: Math.max(2, q.minOperand), max: q.operandCeiling });
      const deadlineState = ctx.state("deadline", "deadline", { start: q.deadlineMs, min: 2000, max: 30000 });
      const makeItem = limit => {
        const op = q.operations === "mixed" ? C.pick(["add","subtract","multiply","divide"]) : q.operations;
        const a = C.rand(q.minOperand, limit), b = C.rand(op === "divide" ? Math.max(1, q.minOperand) : q.minOperand, limit);
        let expression, answer;
        if (q.percentages === "yes" && Math.random() < .2) {
          const percent = C.pick([5,10,15,20,25,50,75]);
          answer = Math.round(a * percent) / 100; expression = C.t("stim.percent", { percent: C.number(percent), value: C.number(a) });
        } else {
          if (op === "add") { answer = a + b; expression = `${C.number(a)} + ${C.number(b)}`; }
          if (op === "subtract") { answer = a - b; expression = `${C.number(a)} − ${C.number(b)}`; }
          if (op === "multiply") { answer = a * b; expression = `${C.number(a)} × ${C.number(b)}`; }
          if (op === "divide") {
            const nontrivial = Math.max(2, q.minOperand) <= Math.floor(limit / 2);
            const divisor = nontrivial ? C.rand(Math.max(2, q.minOperand), Math.floor(limit / 2)) : b;
            answer = C.rand(nontrivial ? 2 : Math.ceil(q.minOperand / divisor), Math.floor(limit / divisor));
            expression = `${C.number(answer * divisor)} ÷ ${C.number(divisor)}`;
          }
          if (q.chained === "yes" && Math.random() < .35) {
            const next = C.rand(q.minOperand, limit);
            expression = `(${expression}) + ${C.number(next)}`; answer += next;
          }
        }
        return { expression, answer, scene: D.text(expression, 36) };
      };
      await ctx.countdown();
      const start = C.now(), recent = [];
      for (let index = 0; !practice || index < 8; index++) {
        const remaining = practice ? Infinity : q.durationSeconds * 1000 - (C.now() - start);
        if (remaining <= 0) break;
        const limit = practice || ctx.mode === "assessment" ? q.maxOperand : Math.round(magnitude.state.value);
        const item = makeItem(limit);
        const fullDeadline = practice || ctx.mode === "assessment" ? q.deadlineMs : deadlineState.state.value;
        const deadline = Math.min(fullDeadline, remaining);
        const row = await ctx.trial({ scene: item.scene, panel, sequence: true, deadline, fullDeadline, noFeedback: true, rtOnSubmit: true,
          meta: { expression: item.expression, answer: item.answer, magnitude: limit, deadlineMs: deadline },
          evaluate: response => response.length > 0 && Math.abs(Number(response.join("")) - item.answer) < .000001 });
        recent.push(row);
        if (practice || ctx.mode === "training") {
          const feedbackMs = Math.min(200, practice ? 200 : q.durationSeconds * 1000 - (C.now() - start));
          if (feedbackMs > 0) await ctx.show(ctx.feedbackImages[Number(row.correct)], feedbackMs);
        }
        if (recent.length === 5) {
          const accuracy = S.accuracy(S.exclude(recent));
          ctx.adapt(deadlineState, { accuracy, fast: S.median(recent.map(r => r.rtMs).filter(Number.isFinite)) < deadline * .75 });
          ctx.adapt(magnitude, { accuracy, errors: recent.filter(r => !r.correct).length });
          recent.length = 0;
        }
      }
      return {};
    },
    score: (rows, q) => ({ ...C.accuracyScore(rows), correctPerMinute: S.eligible(rows).filter(t => t.correct).length * 60 / q.durationSeconds })
  });

  C.define("pvt-b", "vigilance", { durationSeconds: p(180, 180, 180), minIsiMs: p(1000, 1000, 4000, 100),
    maxIsiMs: p(4000, 1000, 8000, 100), lapseMs: p(355, 355, 355), responseMs: p(10000, 2000, 10000, 500) }, {
    touchSupport: "degraded", primaryMetric: "meanReciprocalRT", staircase: "deadline", protocolVersion: 3,
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice";
      const isis = Array.from({ length: practice ? 8 : 181 }, () => C.rand(q.minIsiMs, Math.max(q.minIsiMs, q.maxIsiMs)));
      const responseOption = [{ value: 0, label: C.t("response.respond"), key: "space" }];
      const invisiblePanel = { options: responseOption, zones: [], canvas: document.createElement("canvas"), top: ctx.h };
      await ctx.countdown();
      const start = C.now();
      for (const isi of isis) {
        const remaining = practice ? Infinity : q.durationSeconds * 1000 - (C.now() - start);
        if (remaining <= 0) break;
        const waiting = { options: responseOption, zones: [], responses: [], falseStarts: [], anywhere: true, falseStartPhase: true };
        ctx.current = waiting;
        await ctx.show(ctx.blank, Math.min(isi, remaining));
        ctx.current = null;
        for (const time of waiting.falseStarts) {
          (practice ? ctx.practiceTrials : ctx.trials).push({ stimulusOnset: null, responseTime: time, rtMs: null,
            correct: false, falseStart: true, response: [0], isiMs: isi });
        }
        const available = practice ? q.responseMs : Math.min(q.responseMs, q.durationSeconds * 1000 - (C.now() - start));
        if (available <= 0) break;
        const row = await ctx.trial({ scene: ctx.blank, panel: invisiblePanel, anywhere: true, counter: true,
          deadline: available, noFeedback: true, answer: 0, meta: { isiMs: isi },
          enrich: trial => { trial.unscored = trial.rtMs === null && available < q.lapseMs;
            trial.lapse = !trial.unscored && (trial.rtMs === null || trial.rtMs > q.lapseMs);
            trial.reliabilityValue = trial.rtMs && trial.rtMs >= 150 ? 1000 / trial.rtMs : 0; } });
        if (row.rtMs !== null && row.rtMs < 150) row.falseStart = true;
        // Keep the stopped counter briefly visible, without extending the fixed three-minute run.
        const hold = Math.min(500, practice ? 500 : q.durationSeconds * 1000 - (C.now() - start));
        if (hold > 0) await C.Timing.wait(hold, ctx.signal, () => ctx.paint(null, null, [], row.rtMs ?? q.responseMs));
      }
      return {};
    },
    score(rows) {
      const valid = S.eligible(rows), rts = valid.map(t => t.rtMs).filter(Number.isFinite);
      return { meanReciprocalRT: S.mean(rts.map(rt => 1000 / rt)), meanRT: S.mean(rts),
        lapses: valid.filter(t => t.lapse).length, falseStarts: rows.filter(t => t.falseStart).length,
        accuracy: S.accuracy(rows) };
    }
  });
})();
