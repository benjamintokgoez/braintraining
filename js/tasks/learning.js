(() => {
  const C = window.Cortex, D = C.Draw, S = C.Stats, { p, choice } = C.parameter;
  const keys = ["1","2","3","4","5","6","7","8","9","q","w","e","r","t","y","u"];
  const digits = Array.from({ length: 10 }, (_, i) => i);
  const numericScenes = () => digits.map(value => D.text(value));
  const words = () => C.t("stim.memory.words").split("|");
  const recallScore = rows => ({ ...S.span(rows), accuracy: S.accuracy(rows) });
  const recallFields = (row, expected) => {
    row.recallCorrect = row.response.filter((value, index) => value === expected[index]).length;
    row.reliabilityValue = row.recallCorrect / expected.length;
  };
  S.recognition = rows => {
    const valid = S.eligible(rows), answered = valid.filter(row => [0, 1].includes(row.response[0]));
    const hits = answered.filter(row => row.isTarget && row.response[0] === 0).length;
    const misses = answered.filter(row => row.isTarget && row.response[0] === 1).length;
    const falseAlarms = answered.filter(row => !row.isTarget && row.response[0] === 0).length;
    const correctRejections = answered.filter(row => !row.isTarget && row.response[0] === 1).length;
    return { ...C.accuracyScore(rows), hits, misses, falseAlarms, correctRejections,
      recognitionOmissions: valid.length - answered.length,
      dPrime: hits + misses && falseAlarms + correctRejections ? S.dPrime(hits, misses, falseAlarms, correctRejections) : null };
  };

  C.define("running-span", "working-memory", {
    trials: p(12, 4, 40), recallLength: p(3, 2, 8), maxRecall: p(6, 2, 8),
    minStreamLength: p(8, 4, 24), maxStreamLength: p(14, 5, 32),
    presentationMs: p(600, 200, 2000, 50), recallMs: p(15000, 3000, 60000, 1000)
  }, {
    tier: 2, primaryMetric: "partialCreditLoad", metrics: ["partialCreditLoad","span"], staircase: "stepwise",
    validateParams: q => q.recallLength > q.maxRecall || q.maxRecall >= q.minStreamLength ||
      q.minStreamLength > q.maxStreamLength ? "running.invalidRange" : null,
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice", panel = C.digitRecallPanel(ctx);
      const state = ctx.state("tail-length", "stepwise", { start: q.recallLength, min: 2, max: q.maxRecall });
      const scenes = numericScenes();
      const titles = Array.from({ length: 9 }, (_, n) => D.text(C.t("stim.runningRecall", { count: C.number(n) }), 30));
      const items = Array.from({ length: practice ? 8 : q.trials }, () => {
        const length = practice ? C.rand(4, 7) : C.rand(q.minStreamLength, q.maxStreamLength);
        return Array.from({ length }, () => C.rand(0, 9));
      });
      await ctx.countdown();
      const recent = [];
      for (const stream of items) {
        const load = practice ? 2 : ctx.mode === "assessment" ? q.recallLength : Math.round(state.state.value);
        await ctx.show(titles[load], 1000);
        const onsets = [];
        for (const value of stream) {
          onsets.push(await ctx.show(scenes[value], q.presentationMs * .8));
          await ctx.show(ctx.blank, q.presentationMs * .2);
        }
        const expected = stream.slice(-load);
        const row = await ctx.trial({ scene: ctx.blank, panel, sequence: true, rtOnSubmit: true, deadline: q.recallMs,
          meta: { length: load, stream, streamLength: stream.length, expected, itemOnsets: onsets, condition: load },
          evaluate: response => response.length === load && response.every((value, i) => value === expected[i]),
          enrich: result => recallFields(result, expected) });
        recent.push(row);
        if (recent.length === 2) {
          ctx.adapt(state, { accuracy: S.mean(recent.map(t => t.reliabilityValue)), errors: recent.reduce((n, t) => n + t.length - t.recallCorrect, 0) });
          recent.length = 0;
        }
      }
      return { stimulusSet: "digits" };
    },
    score: recallScore
  });

  C.define("operation-span", "working-memory", {
    minSet: p(2, 2, 7), maxSet: p(5, 2, 8), repetitions: p(3, 1, 5),
    maxOperand: p(12, 2, 99), operations: choice(["mixed","add","multiply"]),
    processingMs: p(4000, 750, 12000, 250), calibrationFactor: p(2.5, 1.5, 4, .1),
    minProcessingAccuracy: p(.85, .5, 1, .05), memoryMs: p(800, 300, 2000, 100),
    recallMs: p(20000, 5000, 60000, 1000), distractorCount: p(3, 0, 4)
  }, {
    tier: 2, primaryMetric: "partialCreditLoad", staircase: "deadline",
    instructionVars: q => ({ criterion: C.number(q.minProcessingAccuracy * 100, 0) }),
    validateParams: q => q.minSet > q.maxSet ? "settings.rangeError" : null,
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice";
      const alphabet = C.t("stim.spanAlphabet").split("");
      const memoryScenes = new Map(alphabet.map(letter => [letter, D.text(letter)]));
      const processingPanel = ctx.prepareOptions(D.options([C.t("response.true"), C.t("response.false")], ["a","l"]));
      const practiceRTs = ctx.practiceTrials.flatMap(row => row.processing || [])
        .filter(row => row.correct && row.rtMs >= 150).map(row => row.rtMs);
      const calibrated = practiceRTs.length >= 4 ? C.clamp(S.mean(practiceRTs) * q.calibrationFactor, 750, 12000) : q.processingMs;
      const state = ctx.state("processing-deadline", "deadline", { start: calibrated, min: 750, max: 12000 });
      const sizes = practice ? Array(8).fill(2) : C.shuffle(Array.from({ length: (q.maxSet - q.minSet + 1) * q.repetitions },
        (_, i) => q.minSet + i % (q.maxSet - q.minSet + 1)));
      const items = sizes.map(length => {
        const letters = C.shuffle(alphabet).slice(0, length + q.distractorCount);
        const sequence = letters.slice(0, length), choices = C.shuffle(letters), expected = sequence.map(letter => choices.indexOf(letter));
        const processing = sequence.map(() => {
          const a = C.rand(1, q.maxOperand), b = C.rand(1, q.maxOperand), c = C.rand(1, q.maxOperand);
          const multiply = q.operations === "multiply" || q.operations === "mixed" && Math.random() < .5;
          const answer = (multiply ? a * b : a + b) + c, isTrue = Math.random() < .5;
          const proposed = isTrue ? answer : answer + C.pick([-1, 1]) * C.rand(1, 5);
          return { isTrue, expression: `(${C.number(a)} ${multiply ? "×" : "+"} ${C.number(b)}) + ${C.number(c)} = ${C.number(proposed)}` };
        });
        return { length, sequence, expected, choices,
          memories: sequence.map(letter => memoryScenes.get(letter)),
          processing: processing.map(item => ({ ...item, scene: D.text(item.expression, 34) })),
          panel: ctx.prepareOptions(D.options(choices, keys)) };
      });
      await ctx.countdown();
      for (const item of items) {
        const processing = [], memoryOnsets = [];
        const deadline = practice || ctx.mode === "assessment" ? q.processingMs : state.state.value;
        for (let i = 0; i < item.length; i++) {
          const problem = item.processing[i];
          processing.push(await ctx.trial({ scene: problem.scene, panel: processingPanel, deadline,
            answer: problem.isTrue ? 0 : 1, noRecord: true, meta: { expression: problem.expression, isTrue: problem.isTrue } }));
          memoryOnsets.push(await ctx.show(item.memories[i], q.memoryMs));
          await ctx.show(ctx.blank, 200);
        }
        await ctx.trial({ scene: ctx.blank, panel: item.panel, sequence: true, maxLength: item.length, deadline: q.recallMs,
          displayResponse: value => item.choices[value],
          meta: { length: item.length, letterSequence: item.sequence, choices: item.choices, expected: item.expected,
            processing, processingDeadlineMs: deadline, memoryOnsets, condition: item.length },
          evaluate: response => response.length === item.length && response.every((value, i) => value === item.expected[i]),
          enrich: row => recallFields(row, item.expected) });
        ctx.adapt(state, { accuracy: S.accuracy(S.exclude(processing)),
          fast: (S.median(processing.map(row => row.rtMs).filter(Number.isFinite)) ?? Infinity) < deadline * .75 });
      }
      const rows = practice ? ctx.practiceTrials : ctx.trials;
      if (!practice && (S.processingAccuracy(rows) ?? 0) < q.minProcessingAccuracy) ctx.invalidate("runner.operationProcessing");
      return { stimulusSet: "letters", processingDeadlineMs: ctx.mode === "assessment" ? q.processingMs :
        S.mean(rows.map(row => row.processingDeadlineMs)) };
    },
    score: rows => ({ ...recallScore(rows), processingAccuracy: S.processingAccuracy(rows) })
  });

  C.define("sternberg", "working-memory", {
    trials: p(48, 12, 120, 4), minSet: p(2, 1, 8), maxSet: p(6, 1, 8),
    targetShare: p(.5, .25, .75, .05), studyMs: p(1000, 250, 5000, 50),
    retentionMs: p(500, 100, 3000, 50), responseMs: p(1500, 500, 10000, 100)
  }, {
    tier: 2, primaryMetric: "accuracy", metrics: ["accuracy","meanRT"], staircase: "deadline",
    validateParams: q => q.minSet > q.maxSet ? "settings.rangeError" : null,
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice", count = practice ? 8 : q.trials;
      const probeScenes = numericScenes();
      const panel = ctx.prepareOptions(D.options([C.t("response.present"), C.t("response.absent")], ["a","l"]));
      const state = ctx.state("search-deadline", "deadline", { start: q.responseMs, min: 500, max: 10000 });
      const targetFlags = C.shuffle(Array.from({ length: count }, (_, i) => i < Math.round(count * q.targetShare)));
      const conditions = C.shuffle(Array.from({ length: count }, (_, i) => ({ isTarget: targetFlags[i],
        setSize: practice ? 2 + i % 2 : q.minSet + i % (q.maxSet - q.minSet + 1) })));
      const items = conditions.map(condition => {
        const memory = C.shuffle(digits).slice(0, condition.setSize);
        const probe = C.pick(condition.isTarget ? memory : digits.filter(digit => !memory.includes(digit)));
        return { ...condition, memory, probe, study: D.text(memory.map(n => C.number(n)).join("   "), 42), scene: probeScenes[probe] };
      });
      await ctx.countdown();
      const recent = [];
      for (const item of items) {
        const deadline = practice || ctx.mode === "assessment" ? q.responseMs : state.state.value;
        const row = await ctx.trial({ phases: [{ scene: item.study, ms: q.studyMs }, { scene: ctx.blank, ms: q.retentionMs }],
          scene: item.scene, panel, deadline, answer: item.isTarget ? 0 : 1,
          meta: { isTarget: item.isTarget, setSize: item.setSize, memory: item.memory, probe: item.probe,
            deadlineMs: deadline, condition: `${item.setSize}/${item.isTarget}` } });
        recent.push(row);
        if (recent.length === 8) {
          ctx.adapt(state, { accuracy: S.accuracy(S.exclude(recent)),
            fast: (S.median(recent.map(t => t.rtMs).filter(Number.isFinite)) ?? Infinity) < deadline * .75 });
          recent.length = 0;
        }
      }
      return { stimulusSet: "digits" };
    },
    score: rows => ({ ...S.recognition(rows), meanRT: S.mean(S.eligible(rows).filter(row => row.correct).map(row => row.rtMs).filter(Number.isFinite)) })
  });

  C.define("paired-associates", "learning", {
    pairs: p(8, 3, 12), maxPairs: p(12, 3, 12), blocks: p(2, 1, 5), recognitionRepeats: p(1, 1, 3),
    studyMs: p(1800, 500, 8000, 100), retentionMs: p(1000, 0, 10000, 100), responseMs: p(4000, 750, 15000, 250)
  }, {
    tier: 2, languageDependent: true, primaryMetric: "dPrime", metrics: ["dPrime","accuracy"], staircase: "stepwise",
    validateParams: q => q.pairs > q.maxPairs ? "settings.rangeError" : null,
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice", vocabulary = words();
      const state = ctx.state("pair-load", "stepwise", { start: q.pairs, min: 3, max: q.maxPairs });
      const panel = ctx.prepareOptions(D.options([C.t("response.intact"), C.t("response.recombined")], ["a","l"]));
      const studyTitle = D.text(C.t("stim.studyPairs"), 30), recognitionTitle = D.text(C.t("stim.recognizePairs"), 30);
      for (let block = 0; block < (practice ? 1 : q.blocks); block++) {
        const load = practice ? 4 : ctx.mode === "assessment" ? q.pairs : Math.round(state.state.value);
        const selected = C.shuffle(vocabulary).slice(0, load * 2);
        const pairs = Array.from({ length: load }, (_, i) => [selected[i], selected[i + load]]);
        const formatPair = pair => D.text(C.t("stim.pairFormat", { left: pair[0], right: pair[1] }), 34);
        const studies = pairs.map(formatPair), repeats = practice ? 1 : q.recognitionRepeats;
        const probes = C.shuffle(Array.from({ length: load * 2 * repeats }, (_, i) => {
          const index = i % load, isTarget = Math.floor(i / load) % 2 === 0;
          const other = (index + C.rand(1, load - 1)) % load;
          const pair = [pairs[index][0], pairs[isTarget ? index : other][1]];
          return { isTarget, pair, scene: formatPair(pair) };
        }));
        await ctx.show(studyTitle, 1200); await ctx.countdown();
        const studyOnsets = [];
        for (const scene of studies) studyOnsets.push(await ctx.show(scene, q.studyMs));
        await ctx.show(ctx.blank, q.retentionMs);
        await ctx.show(recognitionTitle, 1000);
        const recent = [];
        for (const probe of probes) recent.push(await ctx.trial({ scene: probe.scene, panel, deadline: q.responseMs,
          answer: probe.isTarget ? 0 : 1, meta: { block, pairCount: load, isTarget: probe.isTarget, pair: probe.pair, pairs,
            studyOnsets, condition: probe.isTarget ? "intact" : "recombined" } }));
        ctx.adapt(state, { accuracy: S.accuracy(S.exclude(recent)), errors: recent.filter(row => !row.correct).length });
      }
      return { stimulusSet: "words" };
    },
    score: rows => ({ ...S.recognition(rows), pairLoadMean: S.mean(S.eligible(rows).map(row => row.pairCount)) })
  });

  const parseLoci = q => q.route === "custom" ? q.customLoci.split(/\r?\n/).map(text => text.trim().normalize("NFC")).filter(Boolean) :
    C.t(`stim.loci.${q.route}`).split("|");
  C.define("method-loci", "learning", {
    trials: p(5, 2, 20), loci: p(4, 2, 12), maxLoci: p(8, 2, 12),
    route: choice(["home","walk","custom"]), customLoci: { value: "", type: "text", maxLength: 1200, rows: 5 },
    studyMs: p(2500, 750, 10000, 250), recallMs: p(25000, 5000, 90000, 1000), distractorCount: p(3, 0, 4)
  }, {
    tier: 2, languageDependent: true, primaryMetric: "partialCreditLoad", staircase: "stepwise",
    validateParams(q) {
      if (q.loci > q.maxLoci || q.maxLoci + q.distractorCount > 16) return "loci.invalidRange";
      const route = parseLoci(q);
      if (route.length < q.maxLoci || route.some(name => name.length > 60) ||
        new Set(route.map(name => name.toLocaleLowerCase(C.language))).size !== route.length) return "loci.invalidRoute";
      return null;
    },
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice", route = parseLoci(q), vocabulary = words();
      const state = ctx.state("route-load", "stepwise", { start: q.loci, min: 2, max: q.maxLoci });
      const count = practice ? 8 : q.trials;
      const locusScenes = route.slice(0, q.maxLoci).map((name, i) => D.scene((g, w, h) => {
        g.font = '500 25px "Segoe UI", sans-serif'; g.fillText(`${C.number(i + 1)}. ${name}`, w / 2, h / 2, w - 24);
      }, 420, 60));
      const wordScenes = new Map(vocabulary.map(word => [word, D.text(word, 44)]));
      const makeItem = load => {
        const selected = C.shuffle(vocabulary).slice(0, load + q.distractorCount);
        const sequence = selected.slice(0, load), choices = C.shuffle(selected), expected = sequence.map(word => choices.indexOf(word));
        const scenes = sequence.map((word, i) => ({ width: 420, height: 190, layers: [
          { scene: locusScenes[i], x: 0, y: 0, width: 420, height: 60 },
          { scene: wordScenes.get(word), x: 0, y: 60, width: 420, height: 130 }
        ] }));
        return { sequence, choices, expected, scenes, panel: ctx.prepareOptions(D.options(choices, keys), "words") };
      };
      const studyTitle = D.text(C.t("stim.lociStudy"), 30);
      await ctx.countdown();
      for (let index = 0; index < count; index++) {
        const load = practice ? 2 : ctx.mode === "assessment" ? q.loci : Math.round(state.state.value);
        const item = makeItem(load), onsets = [];
        await ctx.show(studyTitle, 1000);
        for (const scene of item.scenes) onsets.push(await ctx.show(scene, practice ? Math.min(q.studyMs, 1500) : q.studyMs));
        const row = await ctx.trial({ scene: ctx.blank, panel: item.panel, sequence: true, maxLength: load, deadline: q.recallMs,
          displayResponse: value => item.choices[value],
          meta: { length: load, locusNames: route.slice(0, load), words: item.sequence, choices: item.choices,
            expected: item.expected, studyOnsets: onsets, condition: load },
          evaluate: response => response.length === load && response.every((value, i) => value === item.expected[i]),
          enrich: result => recallFields(result, item.expected) });
        ctx.adapt(state, { accuracy: row.reliabilityValue, errors: load - row.recallCorrect });
      }
      return { stimulusSet: "words" };
    },
    score: recallScore
  });
})();
