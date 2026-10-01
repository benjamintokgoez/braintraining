(() => {
  const C = window.Cortex, D = C.Draw, S = C.Stats;
  const { p, choice } = C.parameter;
  const options = (ctx, keys, labels) => ctx.prepareOptions(D.options(labels.map(key => C.t(key)), keys));
  const accuracyScore = C.accuracyScore;

  function nbackStream(n, count, targets, alphabet, lureShare, operand = 0) {
    const values = [], lures = [];
    for (let i = 0; i < count; i++) {
      const expected = i >= n ? values[i - n] + operand : null;
      if (targets.has(i)) values.push(expected);
      else {
        const offsets = C.shuffle([n - 1, n + 1]).filter(offset => offset > 0 && i >= offset);
        const lure = offsets.map(offset => values[i - offset] + operand).find(value =>
          value !== expected && alphabet.includes(value));
        const lureValues = offsets.map(offset => values[i - offset] + operand);
        const nonLures = alphabet.filter(value => value !== expected && !lureValues.includes(value));
        values.push(lure !== undefined && Math.random() < lureShare ? lure : C.pick(nonLures));
      }
      lures.push(!targets.has(i) && [n - 1, n + 1].some(offset =>
        offset > 0 && i >= offset && values[i] === values[i - offset] + operand));
    }
    return { values, lures };
  }
  C.nbackStream = nbackStream;
  C.define("dual-nback", "working-memory", {
    variant: choice(["dual", "position", "audio", "arithmetic"]), n: p(2, 1, 9),
    audioStimuli: choice(["letters", "words"]),
    stimulusMs: p(500, 200, 1500, 50), isiMs: p(2500, 500, 5000, 100),
    lureShare: p(.2, 0, .8, .05), operand: p(2, 1, 9), blocks: p(2, 1, 8)
  }, {
    languageDependent: true, landscape: true, primaryMetric: "nLevelMean", staircase: "stepwise",
    async run(ctx) {
      const practice = ctx.phase === "practice", q = ctx.params;
      const usePosition = q.variant !== "audio", useAudio = ["dual", "audio"].includes(q.variant);
      const state = ctx.state(useAudio ? `n|${C.Audio.stimulusSet}` : "n", "stepwise", { start: q.n, min: 1, max: 9 });
      const arithmetic = q.variant === "arithmetic";
      const feedbackImages = ["runner.incorrect", "runner.correct"].map(key => D.text(C.t(key), 36));
      const panel = ctx.prepareOptions([
        ...(usePosition ? [{ value: 0, label: C.t(arithmetic ? "response.match" : "response.position"), key: "a" }] : []),
        ...(useAudio ? [{ value: 1, label: C.t("response.audio"), key: "l" }] : [])
      ], "matches");
      for (let block = 0; block < (practice ? 1 : q.blocks); block++) {
        const n = practice ? Math.min(2, q.n) : Math.round(state.state.value), count = practice ? 8 : 20 + n;
        const targetCount = practice ? 2 : 6, indices = C.shuffle(Array.from({ length: count - n }, (_, i) => i + n));
        const positions = new Set(indices.slice(0, targetCount));
        const audioTargets = new Set([...indices.slice(0, practice ? 1 : 2),
          ...indices.slice(targetCount, targetCount + (practice ? 1 : 4))]);
        const position = nbackStream(n, count, positions, Array.from({ length: arithmetic ? 50 : 9 }, (_, i) => i),
          q.lureShare, arithmetic ? q.operand : 0);
        const audio = nbackStream(n, count, audioTargets, [0,1,2,3,4,5,6,7], q.lureShare);
        const sounds = useAudio ? C.Audio.prepare(audio.values, ctx.language, q.audioStimuli) : [];
        const scenes = position.values.map(value => usePosition ? arithmetic ? D.text(C.number(value)) : D.grid(3, [value]) : ctx.blank);
        const title = D.text(C.t("stim.nbackLevel", { n: C.number(n), variant: C.t(`choice.${q.variant}`) }), 30);
        await ctx.show(title, 1500);
        await ctx.countdown();
        const rows = [];
        for (let i = 0; i < count; i++) {
          let playback;
          rows.push(await ctx.trial({
            scene: scenes[i], panel, deadline: q.stimulusMs + q.isiMs, visibleMs: q.stimulusMs, multi: true,
            noFeedback: i < n, feedbackImages, responseEnabled: i >= n,
            responseHeading: C.t("runner.nbackItem", { item: C.number(i + 1), count: C.number(count), n: C.number(n) }),
            meta: { block, index: i, n, unscored: i < n, position: position.values[i], audio: audio.values[i],
              positionTarget: positions.has(i), audioTarget: audioTargets.has(i),
              positionLure: position.lures[i], audioLure: audio.lures[i],
              isLure: usePosition && position.lures[i] || useAudio && audio.lures[i], usePosition, useAudio },
            onset: trial => {
              if (useAudio) playback = C.Audio.play(sounds[i], trial, q.stimulusMs + q.isiMs).catch(error => {
                if (error.name !== "AbortError") { console.error("N-back audio:", error); ctx.abort("audio.failed"); }
              });
            },
            evaluate: responses => (!usePosition || responses.includes(0) === positions.has(i)) &&
              (!useAudio || responses.includes(1) === audioTargets.has(i))
          }));
          if (useAudio) { await playback; ctx.check(); }
        }
        const scored = this.score(S.exclude(rows), q);
        const total = scored.hits + scored.misses;
        ctx.adapt(state, { accuracy: total ? scored.hits / total : 0,
          errors: scored.falseAlarms + scored.misses, down: -1, downErrors: 5 });
      }
      return { stimulusSet: useAudio ? C.Audio.stimulusSet : arithmetic ? "digits" : "spatial" };
    },
    score(rows) {
      const valid = S.eligible(rows), result = { hits: 0, falseAlarms: 0, misses: 0, correctRejections: 0,
        nLevelMean: S.mean(valid.map(t => t.n)), accuracy: S.accuracy(rows) };
      let lureFA = 0, lureN = 0;
      for (const [stream, button, flag] of [["position", 0, "usePosition"], ["audio", 1, "useAudio"]]) {
        const counts = { hits: 0, falseAlarms: 0, misses: 0, correctRejections: 0 };
        for (const row of valid.filter(t => t[flag])) {
          const yes = row.response.includes(button), target = row[`${stream}Target`];
          counts[target ? yes ? "hits" : "misses" : yes ? "falseAlarms" : "correctRejections"]++;
          if (row[`${stream}Lure`]) { lureN++; if (yes) lureFA++; }
        }
        if (valid.some(t => t[flag])) result[`${stream}DPrime`] = S.dPrime(counts.hits, counts.misses, counts.falseAlarms, counts.correctRejections);
        for (const key of Object.keys(counts)) result[key] += counts[key];
      }
      result.lureFalseAlarmRate = lureN ? lureFA / lureN : null;
      return result;
    }
  });

  C.define("ufov", "processing-speed", {
    durationMs: p(300, 16, 500), durationMinMs: p(16, 16, 250), durationMaxMs: p(500, 251, 500),
    assessmentLevels: p(6, 3, 10), trialsPerSubtest: p(36, 12, 100), responseMs: p(5000, 1000, 10000, 100)
  }, {
    touchSupport: "degraded", landscape: true, staircase: "oneUpTwoDown", primaryMetric: "centralThreshold",
    metrics: ["centralThreshold", "dividedThreshold", "selectiveThreshold"], combineMetrics: true,
    async run(ctx) {
      const practice = ctx.phase === "practice", q = ctx.params;
      const centralPanel = options(ctx, ["a","l"], ["response.car","response.truck"]);
      const radialPanel = ctx.prepareOptions(D.options(Array.from({ length: 8 }, (_, i) => String(i + 1))), "radial");
      const mask = D.mask(), thresholds = {};
      const kinds = ["central", "divided", "selective"];
      for (let subtest = 0; subtest < 3; subtest++) {
        const count = practice ? [3,3,2][subtest] : q.trialsPerSubtest;
        const state = ctx.state(kinds[subtest], "oneUpTwoDown", { start: C.clamp(q.durationMs, q.durationMinMs, q.durationMaxMs),
          min: q.durationMinMs, max: q.durationMaxMs });
        const stimuli = Array.from({ length: count }, () => {
          const truck = C.rand(0, 1), location = C.rand(0, 7);
          const scene = D.scene((g, w, h) => {
            if (subtest === 2) {
              // Six eccentricity rings x eight spokes, with the target replacing one triangle.
              for (let i = 0; i < 48; i++) {
                if (i === location + 32) continue;
                const angle = (i % 8) * Math.PI / 4 - Math.PI / 2;
                const radius = 35 + Math.floor(i / 8) * 13;
                const x = w / 2 + Math.cos(angle) * radius * 1.5, y = h / 2 + Math.sin(angle) * radius;
                g.strokeStyle = D.palette["task-fg"]; g.beginPath();
                g.moveTo(x, y - 5); g.lineTo(x - 5, y + 5); g.lineTo(x + 5, y + 5); g.closePath(); g.stroke();
              }
            }
            D.vehicle(truck, g, w / 2, h / 2);
            if (subtest > 0) {
              const angle = location * Math.PI / 4 - Math.PI / 2;
              g.strokeRect(w / 2 + Math.cos(angle) * 87 * 1.5 - 6, h / 2 + Math.sin(angle) * 87 - 6, 12, 12);
            }
          });
          return { truck, location, scene };
        });
        const fixedDurations = C.shuffle(Array.from({ length: count }, (_, i) =>
          q.durationMinMs * (q.durationMaxMs / q.durationMinMs) ** ((i % q.assessmentLevels) / (q.assessmentLevels - 1))));
        const title = D.text(C.t(`stim.ufov.${kinds[subtest]}`), 30);
        await ctx.show(title, 1500);
        await ctx.countdown();
        for (let index = 0; index < stimuli.length; index++) {
          const item = stimuli[index];
          const duration = practice ? q.durationMs : ctx.mode === "assessment" ? fixedDurations[index] : state.state.value;
          const row = await ctx.trial({ phases: [{ scene: item.scene, ms: duration, stimulus: true }, { scene: mask, ms: 100 }],
            scene: ctx.blank, panel: centralPanel, deadline: q.responseMs, answer: item.truck, noFeedback: subtest > 0,
            meta: { subtest: kinds[subtest], condition: subtest, durationMs: duration, truck: item.truck, location: item.location } });
          if (subtest > 0) {
            const peripheral = await ctx.trial({ scene: ctx.blank, panel: radialPanel, deadline: q.responseMs,
              answer: item.location, noRecord: true });
            row.centralCorrect = row.correct; row.peripheralCorrect = peripheral.correct;
            row.peripheralResponse = peripheral.response; row.peripheralRtMs = peripheral.rtMs;
            row.forcedExclusion = S.exclude([peripheral])[0].excluded;
            row.correct = row.correct && peripheral.correct;
            if (ctx.mode === "training" || practice) await ctx.show(ctx.feedbackImages[Number(row.correct)], 250);
          }
          ctx.adapt(state, { correct: row.correct && !S.exclude([row])[0].excluded });
        }
        thresholds[`${kinds[subtest]}Threshold`] = ctx.mode === "assessment" ?
          S.fixedThreshold(S.exclude(ctx.trials.filter(row => row.subtest === kinds[subtest]))) : C.Adaptive.threshold(state.state);
      }
      return { score: thresholds };
    },
    score(rows) {
      const result = accuracyScore(rows);
      for (const kind of ["central","divided","selective"]) {
        const group = S.eligible(rows).filter(t => t.subtest === kind);
        result[`${kind}Accuracy`] = S.mean(group.map(t => Number(t.correct)));
        result[`${kind}Threshold`] = null;
      }
      return result;
    }
  });

  for (const id of ["stroop-squared", "flanker-squared", "simon-squared"]) {
    C.define(id, "attention", { durationSeconds: p(90, 90, 90), deadlineMs: p(1000, 300, 3000, 50),
      blocks: p(id === "stroop-squared" ? 2 : 1, 1, 4) }, {
      languageDependent: id === "stroop-squared", staircase: "deadline", primaryMetric: "correctPer90", protocolVersion: 3,
      async run(ctx) {
        const practice = ctx.phase === "practice", q = ctx.params;
        const state = ctx.state("deadline", "deadline", { start: q.deadlineMs, min: 300, max: 3000 });
        const ink = ["stim-red","stim-green","stim-blue","stim-yellow"];
        const keys = ["a","l"];
        const blocks = practice ? id === "stroop-squared" && q.blocks > 1 ? 2 : 1 : q.blocks;
        for (let block = 0; block < blocks; block++) {
          const rule = block % 2 === 0 ? "word" : "ink";
          const cache = new Map();
          const makeItem = i => {
            const congruent = i % 2 === 0;
            let target, alternate, scene, labels, signature;
            if (id === "stroop-squared") {
              const word = C.rand(0, 3), color = congruent ? word : C.pick([0,1,2,3].filter(n => n !== word));
              target = rule === "word" ? word : color; alternate = C.pick([0,1,2,3].filter(n => n !== target));
              signature = `${word}-${color}`;
              if (!cache.has(signature)) cache.set(signature, D.text(C.t(`color.${word}`).toUpperCase(), 52, D.palette[ink[color]]));
              scene = cache.get(signature);
              labels = [target, alternate].map(value => C.t(`color.${value}`));
            } else if (id === "flanker-squared") {
              target = C.rand(0, 1); alternate = 1 - target;
              const middle = target ? ">" : "<", side = congruent ? middle : target ? "<" : ">";
              signature = `${middle}${side}`;
              if (!cache.has(signature)) cache.set(signature, D.text(`${side}${side}${middle}${side}${side}`, 60));
              scene = cache.get(signature); labels = [target, alternate].map(n => n ? ">" : "<");
            } else {
              target = C.rand(0, 1); alternate = 1 - target;
              const side = congruent ? target : 1 - target; signature = `${target}${side}`;
              if (!cache.has(signature)) cache.set(signature, D.scene((g, w, h) => {
                g.fillStyle = D.palette[ink[target]];
                g.beginPath(); g.arc(w * (side ? .8 : .2), h / 2, 25, 0, 2 * Math.PI); g.fill();
              }, 420, 120));
              scene = cache.get(signature);
              labels = [C.t("color.0"), C.t("color.1")];
            }
            // Simon has fixed color-to-side mapping; shuffling would destroy spatial congruency.
            const order = id === "simon-squared" ? [0,1] : C.shuffle([0,1]);
            const optionLabels = order.map(n => labels[n]);
            const answer = id === "simon-squared" ? target : order.indexOf(0);
            const panelKey = `panel:${optionLabels.join("|")}`;
            if (!cache.has(panelKey)) cache.set(panelKey, ctx.prepareOptions(D.options(optionLabels, keys)));
            return { scene, panel: cache.get(panelKey), answer, congruent, rule };
          };
          const instruction = D.text(C.t(id === "stroop-squared" ? `response.${rule}` : "response.choose"), 30);
          await ctx.show(instruction, 1500);
          await ctx.countdown();
          const start = C.now(), recent = [];
          for (let index = 0; !practice || index < 8 / blocks; index++) {
            const remaining = practice ? Infinity : 90000 - (C.now() - start);
            if (remaining <= 0) break;
            const item = makeItem(index);
            const fullDeadline = practice || ctx.mode === "assessment" ? q.deadlineMs : state.state.value;
            const deadline = Math.min(fullDeadline, remaining);
            const row = await ctx.trial({ ...item, deadline, fullDeadline, noFeedback: true,
              meta: { block, rule: item.rule, congruent: item.congruent, condition: `${block}-${item.congruent}`, deadlineMs: deadline } });
            recent.push(row);
            if (ctx.mode === "training" || practice) {
              const feedbackTime = Math.min(200, practice ? 200 : 90000 - (C.now() - start));
              if (feedbackTime > 0) await ctx.show(ctx.feedbackImages[Number(row.correct)], feedbackTime);
            }
            if (recent.length === 10) {
              const eligible = S.exclude(recent);
              ctx.adapt(state, { accuracy: S.accuracy(eligible), fast: S.median(recent.map(r => r.rtMs).filter(Number.isFinite)) < state.state.value * .75 });
              recent.length = 0;
            }
          }
        }
        return {};
      },
      score(rows, q) {
        const result = accuracyScore(rows);
        result.correctPer90 = result.correct / q.blocks;
        return result;
      }
    });
  }

  C.define("antisaccade", "attention", { trials: p(72, 24, 144), fixationMinMs: p(1000, 500, 3000, 100),
    fixationMaxMs: p(3000, 1000, 5000, 100), cueMs: p(100, 16, 200), targetMs: p(100, 16, 200),
    responseMs: p(3000, 1000, 10000, 100) }, {
    touchSupport: "degraded", landscape: true, staircase: "oneUpThreeDown", primaryMetric: "accuracy",
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice";
      const state = ctx.state("target", "oneUpThreeDown", { start: q.targetMs, min: 16, max: 200 });
      const panel = ctx.prepareOptions(D.options(["B","P","R"], ["b","p","r"]));
      const fixation = D.text("+", 30), mask = D.text("###                 ###", 36);
      const items = Array.from({ length: practice ? 8 : q.trials }, () => {
        const side = C.rand(0, 1), answer = C.rand(0, 2);
        const cue = D.scene((g, w, h) => { g.fillRect(w * (side ? .85 : .15) - 8, h / 2 - 8, 16, 16); }, 500, 140);
        const target = D.scene((g, w, h) => {
          g.font = "bold 32px monospace"; g.fillText(["B","P","R"][answer], w * (side ? .15 : .85), h / 2);
        }, 500, 140);
        return { side, answer, cue, target, fixationMs: C.rand(q.fixationMinMs, Math.max(q.fixationMinMs, q.fixationMaxMs)) };
      });
      await ctx.countdown();
      for (const item of items) {
        const targetMs = practice || ctx.mode === "assessment" ? q.targetMs : state.state.value;
        const row = await ctx.trial({
          phases: [{ scene: fixation, ms: item.fixationMs }, { scene: item.cue, ms: q.cueMs },
            { scene: item.target, ms: targetMs, stimulus: true }, { scene: mask, ms: 100 }],
          scene: mask, panel, deadline: q.responseMs, answer: item.answer,
          meta: { side: item.side, targetMs, fixationMs: item.fixationMs } });
        ctx.adapt(state, { correct: row.correct });
      }
      return {};
    },
    score: accuracyScore
  });

  C.define("visual-arrays", "working-memory", { trials: p(72, 24, 144, 12), exposureMs: p(250, 50, 1000, 10),
    retentionMs: p(900, 200, 3000, 50), responseMs: p(3000, 500, 10000, 100) }, {
    landscape: true, staircase: "oneUpThreeDown", primaryMetric: "kMean", metrics: ["k4","k6","k8","kMean"],
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice";
      const panel = options(ctx, ["a","l"], ["response.same","response.different"]);
      const state = ctx.state("exposure", "oneUpThreeDown", { start: q.exposureMs, min: 50, max: 1000 });
      const palette = ["stim-red","stim-green","stim-blue","stim-yellow"];
      const conditions = C.shuffle(Array.from({ length: practice ? 8 : q.trials }, (_, i) => ({
        setSize: [4,6,8][i % 3], changed: Math.floor(i / 3) % 2 === 1, distractors: Math.floor(i / 6) % 2 === 1
      })));
      const items = conditions.map(condition => {
        const cells = C.shuffle(Array.from({ length: 24 }, (_, i) => i));
        const values = Array.from({ length: condition.setSize }, () => C.rand(0, 3)), probeIndex = C.rand(0, values.length - 1);
        const probeColor = condition.changed ? C.pick([0,1,2,3].filter(n => n !== values[probeIndex])) : values[probeIndex];
        const square = (g, cell, color) => {
          g.fillStyle = D.palette[color]; g.fillRect(35 + (cell % 6) * 56, 20 + Math.floor(cell / 6) * 54, 24, 24);
        };
        const scene = D.scene(g => {
          values.forEach((value, i) => square(g, cells[i], palette[value]));
          if (condition.distractors) for (let i = condition.setSize; i < condition.setSize + 4; i++) square(g, cells[i], "stim-gray");
        });
        const probe = D.scene(g => square(g, cells[probeIndex], palette[probeColor]));
        return { ...condition, scene, probe, cells: cells.slice(0, condition.setSize), values, probeIndex, probeColor };
      });
      await ctx.countdown();
      for (const item of items) {
        const exposureMs = practice || ctx.mode === "assessment" ? q.exposureMs : state.state.value;
        const row = await ctx.trial({ phases: [{ scene: item.scene, ms: exposureMs }, { scene: ctx.blank, ms: q.retentionMs }],
          scene: item.probe, panel, deadline: q.responseMs, answer: Number(item.changed),
          meta: { setSize: item.setSize, changed: item.changed, distractors: item.distractors, exposureMs,
            cells: item.cells, values: item.values, probeIndex: item.probeIndex, probeColor: item.probeColor } });
        ctx.adapt(state, { correct: row.correct });
      }
      return {};
    },
    score(rows) {
      const result = accuracyScore(rows);
      for (const size of [4,6,8]) {
        const group = S.eligible(rows).filter(t => t.setSize === size);
        const hits = group.filter(t => t.changed && t.response[0] === 1).length;
        const misses = group.filter(t => t.changed && t.response[0] !== 1).length;
        const fas = group.filter(t => !t.changed && t.response[0] !== 0).length;
        const crs = group.filter(t => !t.changed && t.response[0] === 0).length;
        result[`k${size}`] = S.cowan(size, hits, misses, fas, crs);
      }
      result.kMean = S.mean([result.k4, result.k6, result.k8].filter(Number.isFinite));
      return result;
    }
  });
})();
