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
  const LOCI_OBJECT_ICONS = ["\u{1F34E}", "\u{1F34C}", "\u{1F34A}", "\u{1F35E}", "\u{1F95B}", "\u{1F95A}",
    "\u{2615}", "\u{1F944}", "\u{1F374}", "\u{1F37D}", "\u{1F511}", "\u{1F4D6}", "\u{270F}", "\u{1F4F1}",
    "\u{1F45B}", "\u{1F570}", "\u{1F4A1}", "\u{1FA91}", "\u{1F45F}", "\u{1F3A9}", "\u{1F9E5}", "\u{2602}",
    "\u{1F45C}", "\u{1F37E}", "\u{1FAA5}", "\u{1FAAE}", "\u{1F9FC}", "\u{1F9FB}", "\u{2702}", "\u{1F4F7}",
    "\u{26BD}", "\u{1F56F}"];
  const LOCI_PEOPLE = ["Albert Einstein", "Marie Curie", "Ada Lovelace", "Leonardo da Vinci", "William Shakespeare",
    "Ludwig van Beethoven", "Wolfgang Amadeus Mozart", "Frida Kahlo", "Charlie Chaplin", "Audrey Hepburn",
    "Amelia Earhart", "Yuri Gagarin", "Serena Williams", "Usain Bolt", "Lionel Messi", "Taylor Swift"];
  const LOCI_SUITS = [
    { id: "S", symbol: "\u2660", key: "spades", color: "task-fg" },
    { id: "H", symbol: "\u2665", key: "hearts", color: "stim-red" },
    { id: "D", symbol: "\u2666", key: "diamonds", color: "stim-red" },
    { id: "C", symbol: "\u2663", key: "clubs", color: "task-fg" }
  ];
  const LOCI_RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const LOCI_PAGE_SIZE = 6;
  const parsePeople = q => q.publicFigures.split(/\r?\n/).map(name => name.trim().normalize("NFC")).filter(Boolean);
  function lociCatalog(q) {
    if (q.itemSet === "objects") return C.t("stim.loci.objects").split("|").map((label, index) =>
      ({ id: `object-${index}`, label, shortLabel: label, icon: LOCI_OBJECT_ICONS[index], kind: "objects" }));
    if (q.itemSet === "people") return parsePeople(q).map(label =>
      ({ id: `person:${label}`, label, shortLabel: label, kind: "people" }));
    if (q.itemSet === "cards") return LOCI_SUITS.flatMap(suit => LOCI_RANKS.map(rank => ({
      id: `${rank}${suit.id}`, label: C.t("loci.cardName", {
        rank: ["A", "J", "Q", "K"].includes(rank) ? C.t(`loci.rank.${rank}`) : rank,
        suit: C.t(`loci.suit.${suit.key}`)
      }), shortLabel: `${rank} ${suit.symbol}`, rank, suit, kind: "cards"
    })));
    throw new RangeError("Unknown memory-palace item set");
  }
  function lociItemScene(item, compact = false) {
    return D.scene((g, w) => {
      if (item.kind === "objects") {
        g.font = '76px "Apple Color Emoji", "Segoe UI Emoji", sans-serif';
        g.fillText(item.icon, w / 2, 65);
      } else if (item.kind === "people") {
        g.beginPath(); g.arc(w / 2, 38, 24, 0, Math.PI * 2); g.stroke();
        g.beginPath(); g.arc(w / 2, 110, 48, Math.PI, 0); g.stroke();
      } else {
        g.fillStyle = D.palette["task-panel"]; g.fillRect(w / 2 - 62, 4, 124, 125);
        g.strokeRect(w / 2 - 62, 4, 124, 125);
        g.fillStyle = D.palette[item.suit.color];
        g.font = '600 30px "Segoe UI", Aptos, Calibri, sans-serif'; g.fillText(item.rank, w / 2 - 39, 27);
        g.font = '62px "Segoe UI Symbol", "Segoe UI", sans-serif'; g.fillText(item.suit.symbol, w / 2, 82);
      }
      g.fillStyle = D.palette["task-fg"];
      const size = compact ? 30 : 26;
      g.font = `600 ${size}px "Segoe UI", Aptos, Calibri, sans-serif`;
      const lines = [""];
      for (const word of item.label.split(" ")) {
        const last = lines.length - 1, next = [lines[last], word].filter(Boolean).join(" ");
        if (lines[last] && g.measureText(next).width > w - 20 && lines.length < 3) lines.push(word);
        else lines[last] = next;
      }
      lines.forEach((line, index) => g.fillText(line, w / 2,
        (compact ? 154 : 166) + (index - (lines.length - 1) / 2) * size, w - 20));
    }, 420, 200);
  }
  function lociStudyScene(item, position, length, landmark, itemScenes) {
    if (!itemScenes.has(item.id)) itemScenes.set(item.id, lociItemScene(item));
    const title = D.scene((g, w, h) => {
      g.font = '600 26px "Segoe UI", Aptos, Calibri, sans-serif';
      g.fillText(C.t("loci.studyPosition", { count: C.number(position + 1), total: C.number(length) }), w / 2, h / 2);
    }, 420, 60);
    const layers = [
      { scene: title, x: 0, y: 0, width: 420, height: 60 },
      { scene: itemScenes.get(item.id), x: 0, y: 60, width: 420, height: 200 }
    ];
    if (landmark !== null) {
      const hint = D.scene((g, w, h) => {
        g.font = '500 22px "Segoe UI", Aptos, Calibri, sans-serif';
        g.fillText(C.t("loci.landmark", { place: landmark }), w / 2, h / 2, w - 20);
      }, 420, 60);
      layers.push({ scene: hint, x: 0, y: 260, width: 420, height: 60 });
    }
    return { width: 420, height: landmark === null ? 260 : 320, layers };
  }
  async function studyLoci(ctx, sequence, route, itemScenes, selfPaced) {
    let index = 0, hintVisible = false, hintViews = 0;
    const onsets = Array(sequence.length).fill(null), visited = new Set();
    const guided = ctx.params.coaching === "guided", compact = ctx.w > ctx.h && ctx.h < 500;
    const options = selfPaced ? [
      { value: "prev", label: C.t("loci.previous"), key: "ArrowLeft" },
      { value: "next", label: C.t("loci.next"), key: "ArrowRight" },
      { value: "ready", label: C.t("loci.ready"), key: "Enter" }
    ] : [];
    if (guided) options.push({ value: "route", label: C.t("loci.routeHelp"), key: "r" });
    const panel = options.length ? ctx.prepareOptions(options, "words") : null;
    const scene = () => {
      if (!compact) return lociStudyScene(sequence[index], index, sequence.length, hintVisible ? route[index] : null, itemScenes);
      if (!itemScenes.has(sequence[index].id)) itemScenes.set(sequence[index].id, lociItemScene(sequence[index], true));
      return itemScenes.get(sequence[index].id);
    };
    const status = ctx.responseStatus;
    if (panel) panel.statusHeight = compact ? 64 : 104;
    status.classList.add("palace-status");
    status.style.bottom = `${panel ? ctx.h - panel.top + 12 : Math.max(24, ctx.safeBottom + 16)}px`;
    const prompt = (key = null) => {
      const timing = C.t(selfPaced ? "loci.selfPaced" : "loci.fixedStudy", {
        seconds: C.number(ctx.params.studyMs / 1000, 1)
      });
      status.textContent = [compact ? `${C.t("loci.studyPosition", {
        count: C.number(index + 1), total: C.number(sequence.length)
      })} · ${timing}` : timing, key ? C.t(key) : hintVisible && compact ?
        C.t("loci.landmark", { place: route[index] }) : C.t("loci.studyHelp")].join("\n");
    };
    let firstOnset = null, finishedAt = null;
    try {
      const presentations = selfPaced ? 1 : sequence.length;
      for (let presentation = 0; presentation < presentations; presentation++) {
        if (!selfPaced) index = presentation;
        const row = await ctx.trial({
          scene: scene(), panel, noRecord: true, noFeedback: true, rtOnSubmit: true,
          ...(selfPaced ? { selfPaced: true } : { deadline: ctx.params.studyMs, waitFullWindow: true }),
          meta: { stage: "loci-study", studyIndex: index, studyLength: sequence.length, selfPaced, unscored: true },
          onset(trial) {
            firstOnset ??= trial.responseWindowOnset;
            onsets[index] ??= trial.responseWindowOnset;
            visited.add(index);
            prompt();
          },
          interact(value, time, current) {
            let message = null;
            if (value === "route" && guided) {
              hintVisible = !hintVisible;
              if (hintVisible) hintViews++;
            } else if (selfPaced && value === "prev") index = Math.max(0, index - 1);
            else if (selfPaced && value === "next") index = Math.min(sequence.length - 1, index + 1);
            else if (selfPaced && value === "ready") {
              if (visited.size !== sequence.length) message = "loci.reviewAll";
              else return { accepted: false, done: true };
            } else throw new RangeError("Unknown memory-palace study control");
            visited.add(index);
            onsets[index] ??= time;
            current.trial.studyIndex = index;
            prompt(message);
            return { accepted: false, scene: scene() };
          }
        });
        finishedAt = selfPaced ? row.responseTime : row.responseWindowOnset + row.elapsedMs;
      }
    } finally {
      status.textContent = "";
      status.classList.remove("palace-status");
      status.style.bottom = "";
    }
    return { studyOnsets: onsets, studyDurationMs: finishedAt - firstOnset,
      studyMode: selfPaced ? "self-paced" : "fixed", routeHintsUsed: hintViews };
  }
  async function recallLoci(ctx, catalog, sequence, route, study) {
    let page = 0, submitted = false;
    const compact = ctx.w > ctx.h && ctx.h < 500;
    const totalPages = Math.ceil(catalog.length / LOCI_PAGE_SIZE);
    const panels = Array.from({ length: totalPages }, (_, number) => {
      const start = number * LOCI_PAGE_SIZE;
      const options = catalog.slice(start, start + LOCI_PAGE_SIZE).map((item, offset) => ({
        value: start + offset, label: item.shortLabel, ariaLabel: item.label, key: String(offset + 1)
      }));
      options.push(
        { value: "prev", label: C.t("loci.previous"), key: "ArrowLeft" },
        { value: "next", label: C.t("loci.next"), key: "ArrowRight" },
        { value: "back", label: C.t("loci.undo"), key: "Backspace" },
        { value: "skip", label: C.t("loci.skip"), key: "space" },
        { value: "done", label: C.t("loci.submit"), key: "Enter" }
      );
      const panel = ctx.prepareOptions(options, "palace");
      panel.statusHeight = compact ? 80 : 104;
      return panel;
    });
    const status = ctx.responseStatus, expected = sequence.map(item => catalog.indexOf(item));
    const scene = compact ? null : D.text(C.t("loci.recallTitle"), 30);
    status.classList.add("palace-status");
    const prompt = responses => {
      status.style.bottom = `${ctx.h - panels[page].top + 12}px`;
      const progress = C.t("loci.recallProgress", {
        count: C.number(responses.length), total: C.number(sequence.length),
        page: C.number(page + 1), pages: C.number(totalPages)
      });
      status.textContent = [compact ? `${C.t("loci.recallTitle")} · ${progress}` : progress, responses.map((response, index) =>
        `${C.number(index + 1)}: ${response.value === null ? C.t("loci.blank") : catalog[response.value].shortLabel}`).join(" · ") ||
        C.t("loci.recallHelp")].join("\n");
      status.scrollTop = status.scrollHeight;
    };
    try {
      return await ctx.trial({
        scene, panel: panels[0], sequence: true, rtOnSubmit: true, deadline: ctx.params.recallMs,
        meta: { stage: "loci-recall", length: sequence.length, locusNames: route.slice(0, sequence.length),
          words: sequence.map(item => item.label), itemIds: sequence.map(item => item.id),
          choices: catalog.map(item => item.label), catalogIds: catalog.map(item => item.id), expected,
          itemSet: ctx.params.itemSet, coaching: ctx.params.coaching, ...study, condition: sequence.length },
        onset: () => prompt([]),
        interact(value, time, current) {
          if (value === "prev") page = Math.max(0, page - 1);
          else if (value === "next") page = Math.min(totalPages - 1, page + 1);
          else if (value === "back") current.responses.pop();
          else if (value === "done") {
            submitted = true;
            return { accepted: false, done: true };
          } else {
            if (value !== "skip" && (!Number.isInteger(value) || !current.options.some(option => option.value === value))) {
              throw new RangeError("Recall item must belong to the displayed catalogue page");
            }
            if (current.responses.length >= sequence.length) {
              prompt(current.responses);
              status.textContent += `\n${C.t("loci.recallFull")}`;
              return { accepted: false };
            }
            const recorded = value === "skip" ? null : value;
            prompt([...current.responses, { value: recorded }]);
            return { accepted: true, recordValue: recorded };
          }
          prompt(current.responses);
          return { accepted: false, panel: panels[page] };
        },
        evaluate: response => submitted && response.length === expected.length && response.every((value, index) => value === expected[index]),
        enrich(row) {
          row.recallSubmitted = submitted;
          row.recalledItemIds = row.response.map(value => value === null ? null : catalog[value].id);
          row.enteredCorrect = row.response.filter((value, index) => value === expected[index]).length;
          row.recallCorrect = submitted ? row.enteredCorrect : 0;
          row.reliabilityValue = row.recallCorrect / expected.length;
          row.endReason = submitted ? "submitted" : "timeout";
        }
      });
    } finally {
      status.textContent = "";
      status.classList.remove("palace-status");
      status.style.bottom = "";
    }
  }
  C.Loci = { route: parseLoci, catalog: lociCatalog, drawItem: lociItemScene, pageSize: LOCI_PAGE_SIZE };
  C.define("method-loci", "learning", {
    trials: p(5, 2, 20), loci: p(3, 2, 16), maxLoci: p(8, 2, 16),
    itemSet: choice(["objects", "people", "cards"]), coaching: choice(["guided", "independent"]),
    route: choice(["home","walk","custom"]), customLoci: { value: "", type: "text", maxLength: 1200, rows: 5 },
    publicFigures: { value: LOCI_PEOPLE.join("\n"), type: "text", maxLength: 2400, rows: 5 },
    studyMs: { ...p(10000, 750, 60000, 250), labelKey: "param.lociStudyMs" },
    recallMs: p(90000, 5000, 180000, 1000)
  }, {
    tier: 2, protocolVersion: 3, languageDependent: true, primaryMetric: "partialCreditLoad", staircase: "stepwise",
    metrics: ["partialCreditLoad", "accuracy"],
    validateParams(q) {
      if (q.loci > q.maxLoci) return "loci.invalidRange";
      const route = parseLoci(q);
      if (route.length < q.maxLoci || route.some(name => name.length > 60) ||
        new Set(route.map(name => name.toLocaleLowerCase(C.language))).size !== route.length) return "loci.invalidRoute";
      if (q.itemSet === "people") {
        const people = parsePeople(q);
        if (people.length < q.maxLoci || people.length > 32 || people.some(name => name.length > 60) ||
          new Set(people.map(name => name.toLocaleLowerCase(C.language))).size !== people.length) return "loci.invalidPeople";
      }
      return null;
    },
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice", route = parseLoci(q), catalog = lociCatalog(q);
      const state = ctx.state("route-load", "stepwise", { start: q.loci, min: 2, max: q.maxLoci });
      const count = practice ? 8 : q.trials;
      const itemScenes = new Map(), newRound = D.text(C.t("loci.newRound"), 26);
      await ctx.countdown();
      for (let index = 0; index < count; index++) {
        const load = practice ? 2 : ctx.mode === "assessment" ? q.loci : Math.round(state.state.value);
        const sequence = C.shuffle(catalog).slice(0, load);
        await ctx.show(newRound, 800);
        const study = await studyLoci(ctx, sequence, route, itemScenes, practice || ctx.mode === "training");
        const row = await recallLoci(ctx, catalog, sequence, route, study);
        ctx.adapt(state, { accuracy: row.reliabilityValue, errors: load - row.recallCorrect });
      }
      return { stimulusSet: `loci-${q.itemSet}` };
    },
    score(rows) {
      const timed = S.eligible(rows).filter(row => Number.isFinite(row.studyDurationMs) && row.studyDurationMs >= 0);
      return { ...recallScore(rows),
        meanStudySeconds: timed.length ? S.mean(timed.map(row => row.studyDurationMs)) / 1000 : null,
        studySecondsPerItem: timed.length ? timed.reduce((sum, row) => sum + row.studyDurationMs, 0) /
          timed.reduce((sum, row) => sum + row.length, 0) / 1000 : null
      };
    }
  });
})();
