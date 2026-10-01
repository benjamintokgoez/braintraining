(() => {
  'use strict';

  const C = window.Cortex = window.Cortex || {};
  const ATTRIBUTES = [
    { name: 'shape', minimum: 0, modulus: 5 },
    { name: 'shade', minimum: 0, modulus: 3 },
    { name: 'orientation', minimum: 0, modulus: 4 },
    { name: 'size', minimum: 0, modulus: 3 },
    { name: 'count', minimum: 1, modulus: 4 }
  ];
  const MATRIX_BINS = [1, 2, 3, 4, 6];
  const MAX_VALUE = 1_000_000;
  const mod = (value, modulus) => ((value % modulus) + modulus) % modulus;
  const random = (minimum, maximum) => C.rand(minimum, maximum);
  const pick = values => C.pick(values);
  const shuffled = values => {
    const copy = [...values];
    return C.shuffle(copy) || copy;
  };
  const signed = (minimum, maximum) => random(minimum, maximum) * pick([-1, 1]);
  const equal = (left, right) => C.canonical(left) === C.canonical(right);
  const requireInvariant = (condition, message) => {
    if (!condition) throw new Error(`Bennys Brain Gym generator invariant: ${message}`);
  };

  function validateArguments(level, usedSet) {
    if (!Number.isInteger(level) || level < 1 || level > 5) {
      throw new RangeError('Difficulty must be an integer from 1 through 5.');
    }
    if (!usedSet || typeof usedSet.has !== 'function' || typeof usedSet.add !== 'function') {
      throw new TypeError('usedSet must support has(hash) and add(hash).');
    }
  }

  function packCell(cell) {
    return 'bits' in cell
      ? cell.bits
      : ((((cell.shape * 3 + cell.shade) * 3 + cell.size) * 4 + cell.count - 1) * 4 + cell.orientation);
  }

  function matrixHash(family, cells) {
    const packed = cells.map(packCell);
    const transposed = packed.map((_, index) => packed[(index % 3) * 3 + Math.floor(index / 3)]);
    const keys = [packed.slice(0, 8), transposed.slice(0, 8)].map(values => String(C.canonical(values)));
    // An exact compact content key avoids digest collisions; transpose and option order are presentation.
    return `matrix:${family}:${keys.sort()[0]}`;
  }

  function profile(level) {
    if (level === 2) return pick([[2, 1], [1, 2]]);
    return ({ 1: [1, 1], 3: [3, 1], 4: [2, 2], 5: [3, 2] })[level];
  }

  function transformValue(rule, row, column) {
    const offset = rule.axis === 'both'
      ? rule.origin + row * rule.stepDownColumn + column * rule.stepAcrossRow
      : rule.lineStarts[rule.axis === 'row' ? row : column]
        + (rule.axis === 'row' ? column : row) * rule.step;
    return rule.minimum + mod(offset, rule.modulus);
  }

  function transformation(level, ruleCount, directions) {
    const axis = directions === 2 ? 'both' : pick(['row', 'column']);
    const selected = shuffled(ATTRIBUTES).slice(0, ruleCount);
    const fixed = { shape: random(0, 4), shade: random(0, 2), orientation: random(0, 3), size: random(0, 2), count: random(1, 4) };
    const attributes = selected.map(({ name, minimum, modulus }) => {
      const rule = { type: 'modular-attribute-progression', attribute: name, minimum, modulus, axis };
      if (directions === 2) {
        Object.assign(rule, {
          origin: random(0, modulus - 1),
          stepAcrossRow: random(1, modulus - 1),
          stepDownColumn: random(1, modulus - 1)
        });
      } else {
        const first = random(0, modulus - 1);
        const second = random(0, modulus - 1);
        const forbidden = mod(2 * second - first, modulus);
        const third = pick(Array.from({ length: modulus }, (_, i) => i).filter(value => value !== forbidden));
        Object.assign(rule, { step: random(1, modulus - 1), lineStarts: [first, second, third] });
      }
      return rule;
    });
    const cells = Array.from({ length: 9 }, (_, index) => {
      const cell = { ...fixed };
      for (const rule of attributes) cell[rule.attribute] = transformValue(rule, Math.floor(index / 3), index % 3);
      return cell;
    });
    for (const { name } of selected) delete fixed[name];
    return {
      level, family: 'transformation', ruleCount, directions, cells,
      rules: {
        kind: 'attribute-progressions',
        axis,
        attributes,
        fixedAttributes: fixed,
        orientationPolicy: 'Directional stems distinguish all four rotations, including symmetric polygons.',
        equation: 'minimum + modulo(origin + row*stepDownColumn + column*stepAcrossRow, modulus); one-direction rules use independent lineStarts instead.',
        complexity: { ruleCount, directions, bin: ruleCount * directions }
      }
    };
  }

  function bitOperation(operator, left, right, mask) {
    switch (operator) {
      case 'and': return (left & right) & mask;
      case 'or':
      case 'add': return (left | right) & mask;
      case 'xor': return (left ^ right) & mask;
      case 'subtract': return (left & ~right) & mask;
      default: throw new Error(`Unknown bit operator: ${operator}`);
    }
  }

  function regionMasks(ruleCount) {
    if (ruleCount === 1) return [511];
    const strips = pick([[7, 56, 448], [73, 146, 292]]);
    if (ruleCount === 3) return shuffled(strips);
    const single = pick([strips[0], strips[2]]);
    return shuffled([single, 511 ^ single]);
  }

  function visibleLines(axis) {
    const rows = [[0, 1, 2], [3, 4, 5]];
    const columns = [[0, 3, 6], [1, 4, 7]];
    return axis === 'both' ? [...rows, ...columns] : axis === 'row' ? rows : columns;
  }

  function compatibleOperators(values, mask, axis) {
    return ['and', 'or', 'xor', 'subtract'].filter(operator => {
      if (!visibleLines(axis).every(([a, b, result]) => bitOperation(operator, values[a], values[b], mask) === values[result])) return false;
      const across = bitOperation(operator, values[6], values[7], mask);
      const down = bitOperation(operator, values[2], values[5], mask);
      if (axis === 'both' && across !== down) return false;
      return true;
    });
  }

  function makeRegion(operator, mask, axis) {
    const values = Array(9).fill(0);
    if (axis !== 'both') {
      for (let line = 0; line < 3; line++) {
        const left = random(0, 511) & mask;
        const right = random(0, 511) & (operator === 'add' ? mask & ~left : mask);
        const result = bitOperation(operator, left, right, mask);
        const indices = axis === 'row' ? [line * 3, line * 3 + 1, line * 3 + 2] : [line, line + 3, line + 6];
        [left, right, result].forEach((value, index) => { values[indices[index]] = value; });
      }
      const perpendicular = axis === 'row' ? [[0, 3, 6], [1, 4, 7], [2, 5, 8]] : [[0, 1, 2], [3, 4, 5], [6, 7, 8]];
      if (perpendicular.every(([a, b, result]) => bitOperation(operator, values[a], values[b], mask) === values[result])) return null;
    } else {
      const positions = shuffled(Array.from({ length: 9 }, (_, index) => index).filter(index => mask & (1 << index)));
      let patterns;
      switch (operator) {
        case 'and': patterns = [15, pick([3, 5, 10, 12]), pick([1, 2, 4, 8])]; break;
        case 'or': patterns = [0, 15, pick([1, 2, 4, 8])]; break;
        case 'xor': patterns = [pick([1, 2, 4, 7, 8, 11, 13, 14]), pick([3, 5, 6, 9, 10, 12, 15]), random(0, 15)]; break;
        case 'add': patterns = [0, ...shuffled([1, 2, 4, 8]).slice(0, 2)]; break;
        case 'subtract': patterns = [1, pick([2, 4, 6]), 7]; break;
      }
      const seeds = [0, 0, 0, 0];
      positions.forEach((position, index) => {
        const pattern = index < patterns.length ? patterns[index]
          : operator === 'add' ? pick([0, 1, 2, 4, 8])
            : random(0, operator === 'subtract' ? 7 : 15);
        for (let seed = 0; seed < 4; seed++) {
          if (pattern & (1 << seed)) seeds[seed] |= 1 << position;
        }
      });
      [values[0], values[1], values[3], values[4]] = seeds;
      values[2] = bitOperation(operator, values[0], values[1], mask);
      values[5] = bitOperation(operator, values[3], values[4], mask);
      values[6] = bitOperation(operator, values[0], values[3], mask);
      values[7] = bitOperation(operator, values[1], values[4], mask);
      values[8] = bitOperation(operator, values[6], values[7], mask);
      if (values[8] !== bitOperation(operator, values[2], values[5], mask)) return null;
    }
    const compatible = compatibleOperators(values, mask, axis);
    if (!compatible.length) return null;
    for (const alternative of compatible) {
      const prediction = axis === 'column'
        ? bitOperation(alternative, values[2], values[5], mask)
        : bitOperation(alternative, values[6], values[7], mask);
      if (prediction !== values[8]) return null;
    }
    if (new Set(values.slice(0, 8)).size < 3) return null;
    return { values, compatible };
  }

  function logic(level, ruleCount, directions) {
    const axis = directions === 2 ? 'both' : pick(['row', 'column']);
    const operators = shuffled(['and', 'or', 'xor', 'subtract']).slice(0, ruleCount);
    // Set addition equals OR (and XOR on disjoint inputs); do not count equivalent partitions twice.
    if (operators.includes('or') && !operators.includes('xor') && random(0, 1)) {
      operators[operators.indexOf('or')] = 'add';
    }
    const masks = regionMasks(ruleCount);
    const regions = [];
    const values = Array(9).fill(0);
    for (let index = 0; index < ruleCount; index++) {
      let region = null;
      for (let attempt = 0; attempt < 96; attempt++) {
        const candidate = makeRegion(operators[index], masks[index], axis);
        if (candidate && regions.every(previous => !previous.compatibleOperators.some(operator => candidate.compatible.includes(operator)))) {
          region = candidate;
          break;
        }
      }
      if (!region) return null;
      region.values.forEach((value, cell) => { values[cell] |= value; });
      const operator = operators[index];
      regions.push({
        mask: masks[index], operator, axis,
        compatibleOperators: region.compatible,
        seedCells: axis === 'both'
          ? [region.values[0], region.values[1], region.values[3], region.values[4]]
          : (axis === 'row' ? [[0, 1], [3, 4], [6, 7]] : [[0, 3], [1, 4], [2, 5]]).map(pair => pair.map(cell => region.values[cell])),
        meaning: operator === 'add'
          ? 'Disjoint set addition: occupy positions present in either operand; operands never overlap, so there is no carry.'
          : operator === 'subtract'
            ? 'Set subtraction A \\ B: remove positions named by B from A; removing an absent position is a no-op, with no borrowing.'
            : `Position-wise ${operator.toUpperCase()} within this mask.`,
        construction: axis !== 'both' ? 'Three independent operand pairs, one per line.'
          : operator === 'subtract'
            ? 'Top-left 2x2 seeds A,B,C,0. The empty fourth seed makes both compositions equal A \\ (B union C), including non-subset removals.'
            : operator === 'add'
              ? 'Four pairwise-disjoint top-left 2x2 seeds; both directions produce their union.'
              : 'Four top-left 2x2 seeds; the operator is applied across rows and down columns. Associativity and commutativity make both paths agree.'
      });
    }
    if (values[8] === 0 || values[8] === 511 || new Set(values.slice(0, 8)).size < 4) return null;
    return {
      level, family: 'logic', ruleCount, directions,
      cells: values.map(bits => ({ bits })),
      rules: {
        kind: 'partitioned-bit-logic', axis, regions,
        partition: 'Disjoint full rows or columns of the mini-grid; masks cover all nine positions.',
        equation: 'Third cell = operator(first cell, second cell), separately within each mask; combine region outputs by union.',
        complexity: { ruleCount, directions, bin: ruleCount * directions }
      }
    };
  }

  function transformCell(cell, attribute, amount = 1) {
    return { ...cell, [attribute.name]: attribute.minimum + mod(cell[attribute.name] - attribute.minimum + amount, attribute.modulus) };
  }

  function randomTransformCell() {
    return { shape: random(0, 4), shade: random(0, 2), orientation: random(0, 3), size: random(0, 2), count: random(1, 4) };
  }

  function matrixOptions(item) {
    const correct = item.cells[8];
    const entries = [{ cell: { ...correct }, source: 'correct' }];
    const seen = new Set([packCell(correct)]);
    const existing = new Set(item.cells.map(packCell));
    const add = (cell, source) => {
      const key = packCell(cell);
      if (source === 'novel-feature-combination' && existing.has(key)) return false;
      if (entries.length < 8 && !seen.has(key)) {
        seen.add(key);
        entries.push({ cell: { ...cell }, source });
        return true;
      }
      return false;
    };
    const strategy = (source, produce) => {
      for (let attempt = 0; attempt < 24; attempt++) {
        if (add(produce(), source)) break;
      }
    };
    strategy('existing-entry', () => pick(item.cells.slice(0, 8)));
    if (item.family === 'transformation') {
      requireInvariant(item.rules.attributes.length === item.ruleCount, 'attribute rule count');
      strategy('transformed-entry', () => transformCell(pick(item.cells.slice(0, 8)), pick(ATTRIBUTES)));
      strategy('transformed-correct', () => transformCell(correct, pick(ATTRIBUTES)));
      strategy('feature-recombination', () => {
        const cell = { orientation: 0 };
        for (const { name } of ATTRIBUTES) cell[name] = pick(item.cells.slice(0, 8))[name];
        return cell;
      });
      strategy('novel-feature-combination', randomTransformCell);
      for (let attempt = 0; entries.length < 8 && attempt < 128; attempt++) add(randomTransformCell(), 'novel-feature-combination');
      for (let encoded = 0; entries.length < 8 && encoded < 180; encoded++) {
        let value = encoded;
        const count = value % 4 + 1; value = Math.floor(value / 4);
        const size = value % 3; value = Math.floor(value / 3);
        const shade = value % 3; value = Math.floor(value / 3);
        add({ shape: value, shade, size, count, orientation: 0 }, 'novel-feature-combination');
      }
    } else {
      requireInvariant(item.rules.regions.length === item.ruleCount, 'logic rule count');
      strategy('transformed-entry', () => ({ bits: pick(item.cells.slice(0, 8)).bits ^ (1 << random(0, 8)) }));
      strategy('transformed-correct', () => ({ bits: correct.bits ^ (1 << random(0, 8)) }));
      strategy('feature-recombination', () => {
        const mask = pick([7, 56, 448, 73, 146, 292]);
        return { bits: (pick(item.cells.slice(0, 8)).bits & mask) | (pick(item.cells.slice(0, 8)).bits & (511 ^ mask)) };
      });
      strategy('novel-feature-combination', () => ({ bits: random(0, 511) }));
      for (let attempt = 0; entries.length < 8 && attempt < 128; attempt++) add({ bits: random(0, 511) }, 'novel-feature-combination');
      for (let bits = 0; entries.length < 8 && bits <= 511; bits++) add({ bits }, 'novel-feature-combination');
    }
    const options = shuffled(entries);
    item.options = options.map(entry => entry.cell);
    item.answer = options.findIndex(entry => entry.source === 'correct');
    item.rules.distractorSources = options.map(entry => entry.source);
  }

  function auditMatrix(item) {
    requireInvariant(item.cells.length === 9 && item.options.length === 8, 'matrix dimensions');
    requireInvariant(item.ruleCount * item.directions === MATRIX_BINS[item.level - 1], 'matrix difficulty bin');
    for (const cell of [...item.cells, ...item.options]) {
      if (item.family === 'logic') requireInvariant(Number.isInteger(cell.bits) && cell.bits >= 0 && cell.bits <= 511, 'bit range');
      else {
        requireInvariant(Number.isInteger(cell.orientation) && cell.orientation >= 0 && cell.orientation < 4, 'orientation range');
        for (const attribute of ATTRIBUTES) {
          requireInvariant(Number.isInteger(cell[attribute.name]) && cell[attribute.name] >= attribute.minimum
            && cell[attribute.name] < attribute.minimum + attribute.modulus, 'attribute range');
        }
      }
    }
    requireInvariant(new Set(item.options.map(packCell)).size === 8, 'distinct matrix options');
    requireInvariant(equal(item.options[item.answer], item.cells[8]), 'matrix answer');
    if (item.family === 'transformation') {
      for (const rule of item.rules.attributes) {
        item.cells.forEach((cell, index) => requireInvariant(cell[rule.attribute] === transformValue(rule, Math.floor(index / 3), index % 3), 'attribute rule'));
      }
    } else {
      requireInvariant(item.rules.regions.reduce((mask, region) => mask | region.mask, 0) === 511, 'complete partition');
      for (const region of item.rules.regions) {
        const lines = [...visibleLines(region.axis)];
        if (region.axis !== 'column') lines.push([6, 7, 8]);
        if (region.axis !== 'row') lines.push([2, 5, 8]);
        for (const [a, b, result] of lines) {
          requireInvariant(bitOperation(region.operator, item.cells[a].bits, item.cells[b].bits, region.mask) === (item.cells[result].bits & region.mask), 'logic composition');
          if (region.operator === 'add') requireInvariant((item.cells[a].bits & item.cells[b].bits & region.mask) === 0, 'disjoint addition');
        }
      }
    }
  }

  function matrix(level, usedSet = new Set()) {
    validateArguments(level, usedSet);
    for (let attempt = 0; attempt < 4096; attempt++) {
      const [ruleCount, directions] = profile(level);
      const item = random(0, 99) < 55 ? transformation(level, ruleCount, directions) : logic(level, ruleCount, directions);
      if (!item) continue;
      item.hash = matrixHash(item.family, item.cells);
      if (usedSet.has(item.hash)) continue;
      matrixOptions(item);
      auditMatrix(item);
      usedSet.add(item.hash);
      return item;
    }
    throw new RangeError('Unable to find an unseen matrix after 4096 attempts.');
  }

  const operation = (type, operand) => ({ type, operand });
  const applyOperations = (value, operations) => operations.reduce((result, op) => op.type === 'add' ? result + op.operand : result * op.operand, value);

  function recurrentTerms(initial, phases, length) {
    const terms = [initial];
    while (terms.length < length) terms.push(applyOperations(terms.at(-1), phases[(terms.length - 1) % phases.length]));
    return terms;
  }

  function affinePhase(multiplier) {
    return [operation('multiply', multiplier), operation('add', signed(1, 9))];
  }

  function numericRecurrence(level, family, initial, phases, length) {
    return {
      level, family, operatorCount: phases.reduce((count, phase) => count + phase.length, 0), periodLength: phases.length,
      terms: recurrentTerms(initial, phases, length + 1),
      rules: {
        kind: 'periodic-operations', initial, phases,
        indexing: 'Transition from term i to term i+1 uses phases[i % periodLength], starting at i=0. Operations within a phase are applied in order.'
      }
    };
  }

  function alternating(level) {
    if (level === 2) {
      const amount = random(2, 12);
      const other = pick(Array.from({ length: 11 }, (_, i) => i + 2).filter(value => value !== amount));
      const phases = shuffled([
        [operation('add', amount)],
        [pick([operation('multiply', random(2, 4)), operation('add', -other)])]
      ]);
      return numericRecurrence(level, 'alternating', random(15, 60), phases, random(6, 8));
    }
    if (level === 3) {
      const phases = shuffled([
        [operation('add', random(2, 12))],
        [operation('multiply', random(2, 4))],
        [operation('add', -random(2, 12))]
      ]);
      return numericRecurrence(level, 'alternating', random(8, 30), phases, random(7, 8));
    }
    const period = level === 4 ? 2 : 3;
    const phases = shuffled([2, 3, 4]).slice(0, period).map(affinePhase);
    return numericRecurrence(level, 'alternating', random(8, 25), phases, level === 5 ? 8 : random(7, 8));
  }

  function secondDifferences(level) {
    const initial = random(5, 80);
    const initialDifference = random(1, 12);
    const secondDifference = signed(1, 6);
    const length = random(7, 8);
    const terms = [initial];
    let difference = initialDifference;
    while (terms.length <= length) {
      terms.push(terms.at(-1) + difference);
      difference += secondDifference;
    }
    return {
      level, family: 'second-differences', terms, operatorCount: 2, periodLength: 1,
      rules: {
        kind: 'second-differences', initial, initialDifference, secondDifference,
        operations: ['nextValue = value + difference', 'nextDifference = difference + secondDifference'],
        indexing: 'The initialDifference is used to obtain term 1 from term 0, before incrementing the difference.'
      }
    };
  }

  function interleaved(level) {
    const lanes = [0, 1].map((_, index) => {
      const operations = level === 4 ? affinePhase(pick([2, 3]))
        : index === 0 || random(0, 1) ? [operation('add', signed(2, 12))]
          : [operation('multiply', random(2, 4))];
      return { initial: random(5, 35) + index * random(5, 25), operations };
    });
    if (equal(lanes[0].operations, lanes[1].operations)) return null;
    const values = lanes.map(lane => lane.initial);
    const terms = [];
    for (let index = 0; index < 9; index++) {
      const lane = index % 2;
      terms.push(values[lane]);
      values[lane] = applyOperations(values[lane], lanes[lane].operations);
    }
    return {
      level, family: 'interleaved', terms, operatorCount: lanes.reduce((total, lane) => total + lane.operations.length, 0), periodLength: 2,
      rules: {
        kind: 'interleaved', lanes,
        indexing: 'Zero-based even and odd positions form separate lanes. Each lane advances only when that lane is visited; its listed operations apply in order.'
      }
    };
  }

  function alphabet(level) {
    const periodLength = level;
    const offsets = shuffled([-7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7]).slice(0, periodLength);
    const initial = random(0, 25);
    const length = level === 1 ? random(5, 8) : level === 2 ? random(6, 8) : 8;
    const indices = [initial];
    while (indices.length <= length) indices.push(mod(indices.at(-1) + offsets[(indices.length - 1) % periodLength], 26));
    return {
      level, family: 'alphabet', terms: indices.map(index => String.fromCharCode(65 + index)),
      operatorCount: periodLength, periodLength,
      rules: {
        kind: 'alphabet-offsets', alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', initial, offsets, modulus: 26,
        indexing: 'A=0 through Z=25. Transition i uses offsets[i % periodLength]; wrap modulo 26, in either direction.'
      }
    };
  }

  function seriesCandidate(level) {
    const family = level === 1 ? pick(['addition', 'multiplication', 'alphabet'])
      : level === 2 ? pick(['alternating', 'second-differences', 'alphabet'])
        : level === 3 ? pick(['alternating', 'interleaved', 'alphabet'])
          : level === 4 ? pick(['alternating', 'interleaved', 'alphabet'])
            : 'alternating';
    if (family === 'addition') return numericRecurrence(level, family, random(1, 100), [[operation('add', signed(1, 12))]], random(5, 8));
    if (family === 'multiplication') return numericRecurrence(level, family, random(1, 12), [[operation('multiply', random(2, 4))]], random(5, 7));
    if (family === 'alphabet') return alphabet(level);
    if (family === 'interleaved') return interleaved(level);
    if (family === 'second-differences') return secondDifferences(level);
    return alternating(level);
  }

  function replaySeries(rules, length) {
    if (rules.kind === 'periodic-operations') return recurrentTerms(rules.initial, rules.phases, length);
    if (rules.kind === 'second-differences') {
      return Array.from({ length }, (_, index) => rules.initial + index * rules.initialDifference + index * (index - 1) / 2 * rules.secondDifference);
    }
    if (rules.kind === 'interleaved') {
      const values = rules.lanes.map(lane => lane.initial);
      return Array.from({ length }, (_, index) => {
        const lane = index % rules.lanes.length;
        const value = values[lane];
        values[lane] = applyOperations(value, rules.lanes[lane].operations);
        return value;
      });
    }
    const values = [rules.initial];
    while (values.length < length) values.push(mod(values.at(-1) + rules.offsets[(values.length - 1) % rules.offsets.length], 26));
    return values.map(value => String.fromCharCode(65 + value));
  }

  function isSafeSeries(item) {
    if (!item) return false;
    const { terms, rules } = item;
    if (item.family === 'alphabet') return true;
    if (!terms.every(value => Number.isSafeInteger(value) && Math.abs(value) <= MAX_VALUE)) return false;
    if (item.family === 'alternating' && new Set(terms).size !== terms.length) return false;
    if (item.operatorCount > 1) {
      const differences = terms.slice(1).map((value, index) => value - terms[index]);
      if (new Set(differences).size === 1) return false;
      if (terms.slice(1).every((value, index) => terms[index] !== 0 && value * terms[0] === terms[1] * terms[index])) return false;
    }
    if (rules.kind === 'interleaved') {
      for (let lane = 0; lane < rules.lanes.length; lane++) {
        const values = terms.filter((_, index) => index % rules.lanes.length === lane);
        if (new Set(values).size !== values.length) return false;
      }
    }
    if (rules.kind === 'periodic-operations') {
      if (terms.slice(1).some((value, index) => value === terms[index])) return false;
      if (rules.phases.some(phase => phase.length > 1)) {
        for (let phase = 0; phase < rules.phases.length; phase++) {
          const inputs = [];
          for (let index = phase; index < terms.length - 2; index += rules.phases.length) inputs.push(terms[index]);
          if (new Set(inputs).size < 2) return false;
        }
      }
    }
    return true;
  }

  function seriesOptions(item) {
    const correct = item.correctAnswer;
    const entries = [{ value: correct, source: 'correct' }];
    const seen = new Set([correct]);
    const letters = item.family === 'alphabet';
    const add = (value, source) => {
      if (letters && typeof value === 'number') value = String.fromCharCode(65 + mod(value, 26));
      const valid = letters ? typeof value === 'string' && /^[A-Z]$/.test(value)
        : Number.isSafeInteger(value) && Math.abs(value) <= MAX_VALUE;
      if (valid && entries.length < 6 && !seen.has(value)) {
        seen.add(value);
        entries.push({ value, source });
      }
    };
    const last = item.sequence.at(-1);
    if (letters) {
      const lastIndex = last.charCodeAt(0) - 65;
      const nextOffset = item.rules.offsets[(item.sequence.length - 1) % item.periodLength];
      add(lastIndex - nextOffset, 'reversed-offset');
      for (const offset of shuffled(item.rules.offsets)) add(lastIndex + offset, 'wrong-phase');
      add(correct.charCodeAt(0) - 65 + 1, 'one-position-too-far');
      add(correct.charCodeAt(0) - 65 - 1, 'one-position-too-short');
      add(last, 'repeated-entry');
      for (const index of shuffled(Array.from({ length: 26 }, (_, i) => i))) add(index, 'other-letter');
    } else {
      const difference = last - item.sequence.at(-2);
      if (item.rules.kind === 'periodic-operations') {
        for (const phase of shuffled(item.rules.phases)) {
          add(applyOperations(last, phase), 'wrong-phase');
          if (phase.length > 1) {
            add(applyOperations(last, phase.slice(0, 1)), 'omitted-operation');
            add(applyOperations(last, [...phase].reverse()), 'reversed-composition');
          }
        }
      } else if (item.rules.kind === 'interleaved') {
        for (const lane of shuffled(item.rules.lanes)) add(applyOperations(last, lane.operations), 'wrong-lane');
      } else {
        add(last + difference - item.rules.secondDifference, 'reversed-second-difference');
        add(last + difference + 2 * item.rules.secondDifference, 'advanced-difference-twice');
      }
      add(last + difference, 'repeated-last-difference');
      add(correct + pick([-1, 1]), 'off-by-one');
      add(last, 'repeated-entry');
      for (let distance = 1; entries.length < 6 && distance < 20; distance++) {
        add(correct + distance, 'nearby-value');
        add(correct - distance, 'nearby-value');
      }
    }
    const options = shuffled(entries);
    item.options = options.map(entry => entry.value);
    item.answer = options.findIndex(entry => entry.source === 'correct');
    item.rules.distractorSources = options.map(entry => entry.source);
  }

  function auditSeries(item) {
    requireInvariant(item.sequence.length >= 5 && item.sequence.length <= 8, 'series length');
    requireInvariant(item.options.length === 6 && new Set(item.options).size === 6, 'distinct series options');
    requireInvariant(item.options[item.answer] === item.correctAnswer, 'series answer');
    requireInvariant(equal(replaySeries(item.rules, item.sequence.length + 1), [...item.sequence, item.correctAnswer]), 'series rule replay');
    const operators = item.rules.kind === 'periodic-operations'
      ? item.rules.phases.reduce((total, phase) => total + phase.length, 0)
      : item.rules.kind === 'interleaved' ? item.rules.lanes.reduce((total, lane) => total + lane.operations.length, 0)
        : item.rules.kind === 'alphabet-offsets' ? item.rules.offsets.length : 2;
    requireInvariant(item.operatorCount === operators, 'actual operator count');
  }

  function series(level, usedSet = new Set()) {
    validateArguments(level, usedSet);
    for (let attempt = 0; attempt < 4096; attempt++) {
      const candidate = seriesCandidate(level);
      if (!isSafeSeries(candidate)) continue;
      const { terms, ...item } = candidate;
      item.sequence = terms.slice(0, -1);
      item.correctAnswer = terms.at(-1);
      // Neither metadata nor shuffled choices may turn the same visible sequence into a new item.
      item.hash = `series:${C.canonical(item.sequence)}`;
      if (usedSet.has(item.hash)) continue;
      item.rules.complexity = { operatorCount: item.operatorCount, periodLength: item.periodLength, score: item.operatorCount + item.periodLength };
      seriesOptions(item);
      auditSeries(item);
      usedSet.add(item.hash);
      return item;
    }
    throw new RangeError('Unable to find an unseen series after 4096 attempts.');
  }

  C.Generators = { matrix, series };
})();
