(() => {
  const C = window.Cortex, D = C.Draw, S = C.Stats, { p } = C.parameter;
  for (const id of ["matrix-reasoning", "number-series"]) {
    C.define(id, "reasoning", { trials: p(30, 10, 100, 5), startLevel: p(1, 1, 5),
      minLevel: p(1, 1, 5), maxLevel: p(5, 1, 5), responseMs: p(30000, 5000, 120000, 1000) }, {
      landscape: id === "matrix-reasoning", staircase: "stepwise", primaryMetric: "estimatedThreshold",
      metrics: ["estimatedThreshold","accuracy"],
      async run(ctx) {
        const practice = ctx.phase === "practice", q = ctx.params, matrix = id === "matrix-reasoning";
        const count = practice ? 8 : q.trials;
        const minLevel = Math.min(q.minLevel, q.maxLevel), maxLevel = Math.max(q.minLevel, q.maxLevel);
        const state = ctx.state("difficulty", "stepwise", { start: q.startLevel, min: minLevel, max: maxLevel });
        const hashes = ctx.itemHashes?.[id] || [];
        const used = new Set([...C.Storage.getItemHashes(id), ...hashes]);
        ctx.itemHashes = { ...ctx.itemHashes, [id]: hashes };
        const levels = practice ? [1] : Array.from({ length: maxLevel - minLevel + 1 }, (_, i) => minLevel + i);
        const matrixPanel = matrix ? ctx.prepareOptions(D.options(Array.from({ length: 8 }, (_, i) => String(i + 1))), "pictures") : null;
        const fixedLevels = C.shuffle(Array.from({ length: count }, (_, i) => levels[i % levels.length]));
        const recent = [];
        await ctx.countdown();
        for (let index = 0; index < count; index++) {
          const level = practice ? 1 : ctx.mode === "assessment" ? fixedLevels[index] : Math.round(state.state.value);
          const item = matrix ? C.Generators.matrix(level, used) : C.Generators.series(level, used);
          hashes.push(item.hash);
          const panel = matrix ? matrixPanel : ctx.prepareOptions(D.options(item.options.map(option =>
            typeof option === "number" ? C.number(option) : String(option))));
          const scene = matrix ? ctx.prepareMatrix(item, panel) : D.series(item.sequence.map(value =>
            typeof value === "number" ? C.number(value) : value));
          const row = await ctx.trial({ scene, panel, deadline: q.responseMs, answer: item.answer,
            meta: { level, itemHash: item.hash, family: item.family, answer: item.answer,
              rules: item.rules, cells: item.cells, sequence: item.sequence, options: item.options,
              ruleCount: item.ruleCount, directions: item.directions, operatorCount: item.operatorCount, periodLength: item.periodLength } });
          recent.push(row);
          if (recent.length === 5) {
            ctx.adapt(state, { accuracy: S.accuracy(S.exclude(recent)), errors: recent.filter(t => !t.correct).length,
              up: .8, down: .4, downErrors: 3 });
            recent.length = 0;
          }
        }
        return { stimulusSet: matrix ? "visual" : "mixed" };
      },
      score(rows) {
        const valid = S.eligible(rows), score = C.accuracyScore(rows);
        const passed = [];
        for (let level = 1; level <= 5; level++) {
          const group = valid.filter(row => row.level === level);
          score[`bin${level}`] = S.mean(group.map(row => Number(row.correct)));
          if (group.length >= 3 && score[`bin${level}`] >= .7) passed.push(level);
        }
        score.estimatedThreshold = passed.length ? Math.max(...passed) : null;
        return score;
      }
    });
  }
})();
