(() => {
  const C = window.Cortex, D = C.Draw, S = C.Stats, { p, choice } = C.parameter;
  const PRACTICE_TRIALS = 8;
  const IS_FINITE = Number.isFinite;
  const asRows = rows => rows.some(row => row && typeof row === "object" && "excluded" in row) ? rows : S.exclude(rows);
  const meanFinite = values => S.mean(values.filter(IS_FINITE));
  const cloneCells = cells => cells.map(([x, y, z]) => [x, y, z]);
  const cloneState = state => state.map(peg => peg.slice());
  const range = (start, end) => Array.from({ length: end - start + 1 }, (_, i) => start + i);
  const shuffle = (values, rng = Math.random) => {
    const copy = values.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  };
  const pick = (values, rng = Math.random) => values[Math.floor(rng() * values.length)];
  const normalizeRows = rows => asRows(rows);

  function makeCanvas(width, height, paint, opaque = false) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext("2d");
    if (opaque) {
      g.fillStyle = D.palette["task-bg"];
      g.fillRect(0, 0, width, height);
    }
    paint(g, width, height);
    return canvas;
  }

  function permutationParity(perm) {
    let inversions = 0;
    for (let i = 0; i < perm.length; i++) {
      for (let j = i + 1; j < perm.length; j++) if (perm[i] > perm[j]) inversions++;
    }
    return inversions % 2 ? -1 : 1;
  }

  const permutations = [
    [0, 1, 2], [0, 2, 1], [1, 0, 2],
    [1, 2, 0], [2, 0, 1], [2, 1, 0]
  ];
  const signTriples = [
    [-1, -1, -1], [-1, -1, 1], [-1, 1, -1], [-1, 1, 1],
    [1, -1, -1], [1, -1, 1], [1, 1, -1], [1, 1, 1]
  ];

  const rotations = [];
  for (const perm of permutations) {
    const parity = permutationParity(perm);
    for (const signs of signTriples) {
      if (parity * signs[0] * signs[1] * signs[2] !== 1) continue;
      const matrix = Array.from({ length: 3 }, () => [0, 0, 0]);
      for (let row = 0; row < 3; row++) matrix[row][perm[row]] = signs[row];
      rotations.push(matrix);
    }
  }

  const matrixId = matrix => matrix.flat().join(",");
  const uniqueRotationIds = new Set(rotations.map(matrixId));
  if (rotations.length !== 24 || uniqueRotationIds.size !== 24) throw new Error("Rotation group generation failed");

  const transpose = matrix => [
    [matrix[0][0], matrix[1][0], matrix[2][0]],
    [matrix[0][1], matrix[1][1], matrix[2][1]],
    [matrix[0][2], matrix[1][2], matrix[2][2]]
  ];
  const multiplyMatrix = (a, b) => Array.from({ length: 3 }, (_, row) =>
    Array.from({ length: 3 }, (_, col) => a[row][0] * b[0][col] + a[row][1] * b[1][col] + a[row][2] * b[2][col]));
  const applyMatrix = (matrix, [x, y, z]) => [
    matrix[0][0] * x + matrix[0][1] * y + matrix[0][2] * z,
    matrix[1][0] * x + matrix[1][1] * y + matrix[1][2] * z,
    matrix[2][0] * x + matrix[2][1] * y + matrix[2][2] * z
  ];
  const pointKey = ([x, y, z]) => `${x},${y},${z}`;
  const comparePoints = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
  const normalizeCellsInternal = cells => {
    const mins = [0, 1, 2].map(axis => Math.min(...cells.map(cell => cell[axis])));
    return cells.map(([x, y, z]) => [x - mins[0], y - mins[1], z - mins[2]]).sort(comparePoints);
  };
  const serializeCells = cells => normalizeCellsInternal(cells).map(pointKey).join(";");
  const rotateCells = (cells, matrix) => normalizeCellsInternal(cells.map(cell => applyMatrix(matrix, cell)));
  const extents = cells => [0, 1, 2].map(axis => Math.max(...cells.map(cell => cell[axis])) - Math.min(...cells.map(cell => cell[axis])) + 1);
  const reflectCells = cells => cells.map(([x, y, z]) => [-x, y, z]);
  const canonicalCells = cells => {
    let best = null;
    for (const matrix of rotations) {
      const key = serializeCells(cells.map(cell => applyMatrix(matrix, cell)));
      if (best === null || key < best) best = key;
    }
    return best;
  };
  const connectedCells = cells => {
    const keys = new Set(cells.map(pointKey));
    const queue = [cells[0]];
    const seen = new Set([pointKey(cells[0])]);
    const deltas = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    for (let i = 0; i < queue.length; i++) {
      const [x, y, z] = queue[i];
      for (const [dx, dy, dz] of deltas) {
        const next = `${x + dx},${y + dy},${z + dz}`;
        if (keys.has(next) && !seen.has(next)) {
          seen.add(next);
          queue.push(next.split(",").map(Number));
        }
      }
    }
    return seen.size === cells.length;
  };
  const degreeHistogram = cells => {
    const set = new Set(cells.map(pointKey));
    const deltas = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    return cells.map(([x, y, z]) => deltas.filter(([dx, dy, dz]) => set.has(`${x + dx},${y + dy},${z + dz}`)).length);
  };
  const rotationAngleDeg = matrix => {
    const trace = matrix[0][0] + matrix[1][1] + matrix[2][2];
    if (trace === 3) return 0;
    if (trace === 1) return 90;
    if (trace === 0) return 120;
    return 180;
  };
  const projectVertex = ([x, y, z]) => ({
    x: (x - y) * Math.sqrt(3) / 2,
    y: (x + y) * .5 - z
  });
  const visibleFaces = cells => {
    const set = new Set(cells.map(pointKey));
    const faces = [];
    const faceDefs = [
      {
        type: "x",
        offset: [1, 0, 0],
        corners: ([x, y, z]) => [[x + 1, y, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x + 1, y, z + 1]],
        order: 1
      },
      {
        type: "y",
        offset: [0, 1, 0],
        corners: ([x, y, z]) => [[x, y + 1, z], [x + 1, y + 1, z], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]],
        order: 2
      },
      {
        type: "z",
        offset: [0, 0, 1],
        corners: ([x, y, z]) => [[x, y, z + 1], [x + 1, y, z + 1], [x + 1, y + 1, z + 1], [x, y + 1, z + 1]],
        order: 3
      }
    ];
    for (const cell of cells) {
      const [x, y, z] = cell;
      for (const face of faceDefs) {
        const neighbor = `${x + face.offset[0]},${y + face.offset[1]},${z + face.offset[2]}`;
        if (set.has(neighbor)) continue;
        faces.push({
          type: face.type,
          depth: x + y + z + face.order * .01,
          vertices: face.corners(cell).map(projectVertex)
        });
      }
    }
    faces.sort((a, b) => a.depth - b.depth);
    return faces;
  };
  const round3 = value => Math.round(value * 1000) / 1000;
  const projectionSignature = cells => visibleFaces(cells).map(face =>
    `${face.type}:${face.vertices.map(vertex => `${round3(vertex.x)},${round3(vertex.y)}`).join("|")}`).join(";");
  const orientationKeys = cells => rotations.map(matrix => serializeCells(cells.map(cell => applyMatrix(matrix, cell))));
  const projectionKeys = cells => rotations.map(matrix => projectionSignature(rotateCells(cells, matrix)));
  const baseFigures = [
    [[0, 0, 0], [0, 1, 0], [1, 0, 0], [1, 0, 1]],
    [[0, 0, 1], [0, 1, 1], [1, 0, 0], [1, 0, 1]]
  ];
  const summarizeFigure = cells => {
    const normalized = normalizeCellsInternal(cells);
    const reflected = reflectCells(normalized);
    return {
      cells: normalized,
      canonical: canonicalCells(normalized),
      reflectedCanonical: canonicalCells(reflected),
      extents: extents(normalized),
      orientationCount: new Set(orientationKeys(normalized)).size,
      projectionCount: new Set(projectionKeys(normalized)).size
    };
  };

  function randomFigure(blockCount, rng = Math.random, maxAttempts = 4096) {
    if (!Number.isInteger(blockCount) || blockCount < 4 || blockCount > 10) {
      throw new RangeError("Rotation figures require 4 to 10 blocks");
    }
    const deltas = [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
    if (blockCount === 4) {
      const seedRotation = rotations[Math.floor(rng() * rotations.length)];
      const seeded = baseFigures[Math.floor(rng() * baseFigures.length)]
        .map(cell => applyMatrix(seedRotation, cell));
      return summarizeFigure(seeded);
    }
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const seedRotation = rotations[Math.floor(rng() * rotations.length)];
      const seed = normalizeCellsInternal(baseFigures[Math.floor(rng() * baseFigures.length)]
        .map(cell => applyMatrix(seedRotation, cell)));
      const cells = cloneCells(seed);
      const occupied = new Set(cells.map(pointKey));
      while (cells.length < blockCount) {
        const frontier = [];
        const frontierKeys = new Set();
        for (const [x, y, z] of cells) for (const [dx, dy, dz] of deltas) {
          const candidate = [x + dx, y + dy, z + dz];
          const key = pointKey(candidate);
          if (occupied.has(key) || frontierKeys.has(key)) continue;
          frontierKeys.add(key);
          const trial = cells.concat([candidate]);
          const dims = extents(trial).filter(size => size > 1).length;
          const centered = Math.abs(candidate[0]) + Math.abs(candidate[1]) + Math.abs(candidate[2]);
          frontier.push({ candidate, weight: 1 + dims * 2 + Math.max(0, 4 - centered) * .2 + rng() });
        }
        const total = frontier.reduce((sum, entry) => sum + entry.weight, 0);
        let cursor = rng() * total;
        let chosen = frontier[0].candidate;
        for (const entry of frontier) {
          cursor -= entry.weight;
          if (cursor <= 0) { chosen = entry.candidate; break; }
        }
        cells.push(chosen);
        occupied.add(pointKey(chosen));
      }
      const normalized = normalizeCellsInternal(cells);
      const sizes = extents(normalized);
      if (sizes.some(size => size < 2) || !connectedCells(normalized)) continue;
      const reflected = reflectCells(normalized);
      if (canonicalCells(normalized) === canonicalCells(reflected)) continue;
      const degrees = degreeHistogram(normalized);
      if (Math.max(...degrees) < 3 || degrees.filter(value => value === 1).length < 2) continue;
      const oriented = new Set(orientationKeys(normalized));
      const projected = new Set(projectionKeys(normalized));
      if (oriented.size < 12 || projected.size < 8) continue;
      return summarizeFigure(normalized);
    }
    throw new RangeError(`Unable to generate an asymmetric ${blockCount}-block figure`);
  }

  const rotationPairCache = new Map();
  const rotationPairsByAngle = angle => {
    if (!rotationPairCache.has(angle)) {
      const pairs = [];
      for (let i = 0; i < rotations.length; i++) {
        for (let j = 0; j < rotations.length; j++) {
          const relative = multiplyMatrix(transpose(rotations[i]), rotations[j]);
          if (rotationAngleDeg(relative) === angle) pairs.push([i, j]);
        }
      }
      rotationPairCache.set(angle, pairs);
    }
    return rotationPairCache.get(angle);
  };
  const allowedAngles = (minAngle, maxAngle) => [90, 120, 180].filter(angle => angle >= minAngle && angle <= maxAngle);

  function generateRotationPair({ blockCount, same, angleDeg, rng = Math.random, maxAttempts = 1024 }) {
    const pairs = rotationPairsByAngle(angleDeg);
    if (!pairs.length) throw new RangeError(`Unsupported mental-rotation angle ${angleDeg}`);
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const figure = randomFigure(blockCount, rng);
      const originalProjectionSet = new Set(projectionKeys(figure.cells));
      const [leftIndex, rightIndex] = pick(pairs, rng);
      const leftCells = rotateCells(figure.cells, rotations[leftIndex]);
      const rightSource = same ? figure.cells : reflectCells(figure.cells);
      const rightCells = rotateCells(rightSource, rotations[rightIndex]);
      const leftProjection = projectionSignature(leftCells);
      const rightProjection = projectionSignature(rightCells);
      if (leftProjection === rightProjection) continue;
      if (!same && originalProjectionSet.has(rightProjection)) continue;
      return {
        blockCount,
        same,
        answer: same ? 0 : 1,
        angleDeg,
        cells: figure.cells,
        mirroredCells: normalizeCellsInternal(reflectCells(figure.cells)),
        canonical: figure.canonical,
        leftRotationIndex: leftIndex,
        rightRotationIndex: rightIndex,
        leftRotation: rotations[leftIndex],
        rightRotation: rotations[rightIndex],
        leftCells,
        rightCells,
        leftProjection,
        rightProjection
      };
    }
    throw new RangeError("Unable to generate a discriminable mental-rotation pair");
  }

  function renderRotationFigure(cells, resolution) {
    const width = Math.ceil(330 * resolution), height = Math.ceil(280 * resolution);
    const faces = visibleFaces(cells);
    const vertices = faces.flatMap(face => face.vertices);
    const minX = Math.min(...vertices.map(vertex => vertex.x));
    const maxX = Math.max(...vertices.map(vertex => vertex.x));
    const minY = Math.min(...vertices.map(vertex => vertex.y));
    const maxY = Math.max(...vertices.map(vertex => vertex.y));
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const scale = Math.min((width - 36 * resolution) / spanX, (height - 36 * resolution) / spanY);
    const offsetX = (width - spanX * scale) / 2 - minX * scale;
    const offsetY = (height - spanY * scale) / 2 - minY * scale;
    const fills = {
      x: D.palette["stim-blue"],
      y: D.palette["stim-gray"],
      z: D.palette["stim-yellow"]
    };
    return makeCanvas(width, height, g => {
      g.lineJoin = "round";
      g.lineCap = "round";
      g.lineWidth = 1.5 * resolution;
      for (const face of faces) {
        g.beginPath();
        face.vertices.forEach((vertex, index) => {
          const x = vertex.x * scale + offsetX;
          const y = vertex.y * scale + offsetY;
          if (!index) g.moveTo(x, y);
          else g.lineTo(x, y);
        });
        g.closePath();
        g.fillStyle = fills[face.type];
        g.strokeStyle = D.palette["task-fg"];
        g.fill();
        g.stroke();
      }
    });
  }

  function rotationFrameCanvas(portrait) {
    return makeCanvas(portrait ? 350 : 700, portrait ? 615 : 310, (g, w, h) => {
      g.fillStyle = D.palette["task-bg"];
      g.fillRect(0, 0, w, h);
      g.fillStyle = D.palette["task-panel"];
      g.strokeStyle = D.palette["stim-gray"];
      g.lineWidth = 2;
      g.fillRect(portrait ? 7.5 : 5, 5, 335, 300);
      g.strokeRect(portrait ? 7.5 : 5, 5, 335, 300);
      g.fillRect(portrait ? 7.5 : 360, portrait ? 310 : 5, 335, 300);
      g.strokeRect(portrait ? 7.5 : 360, portrait ? 310 : 5, 335, 300);
    }, true);
  }

  function makeRotationScene(frame, leftFigure, rightFigure, portrait) {
    return {
      width: frame.width,
      height: frame.height,
      layers: [
        { scene: frame, x: 0, y: 0, width: frame.width, height: frame.height },
        { scene: leftFigure, x: portrait ? 10 : 8, y: 15, width: 330, height: 280 },
        { scene: rightFigure, x: portrait ? 10 : 362, y: portrait ? 320 : 15, width: 330, height: 280 }
      ]
    };
  }

  const TOWER_CAPACITIES = [3, 2, 1];
  const TOWER_BALLS = ["red", "green", "blue"];
  const serializeState = state => state.map(peg => peg.join("")).join("|");
  const parseState = key => key.split("|").map(peg => peg ? peg.split("").map(Number) : []);
  const towerMoveError = (state, from, to) => {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from > 2 || to < 0 || to > 2) return "invalid-peg";
    if (from === to) return "same-peg";
    if (!state[from]?.length) return "empty-source";
    if (state[to].length >= TOWER_CAPACITIES[to]) return "illegal-destination";
    return null;
  };
  const moveBall = (state, from, to) => {
    if (towerMoveError(state, from, to)) return null;
    const next = cloneState(state);
    const ball = next[from].pop();
    next[to].push(ball);
    return { state: next, key: serializeState(next), from, to, ball, ballColor: TOWER_BALLS[ball] };
  };
  const towerNeighbors = state => {
    const next = [];
    for (let from = 0; from < 3; from++) {
      if (!state[from].length) continue;
      for (let to = 0; to < 3; to++) {
        if (from === to) continue;
        const move = moveBall(state, from, to);
        if (move) next.push(move);
      }
    }
    return next;
  };

  const towerStart = [[0, 1, 2], [], []];
  const towerStateMap = new Map([[serializeState(towerStart), cloneState(towerStart)]]);
  const towerQueue = [cloneState(towerStart)];
  for (let i = 0; i < towerQueue.length; i++) {
    for (const neighbor of towerNeighbors(towerQueue[i])) {
      if (!towerStateMap.has(neighbor.key)) {
        towerStateMap.set(neighbor.key, cloneState(neighbor.state));
        towerQueue.push(cloneState(neighbor.state));
      }
    }
  }
  const towerStates = [...towerStateMap.values()].map(cloneState);
  const towerAdjacency = new Map(towerStates.map(state => [serializeState(state), towerNeighbors(state)]));

  function solveTower(start, goal) {
    const startKey = typeof start === "string" ? start : serializeState(start);
    const goalKey = typeof goal === "string" ? goal : serializeState(goal);
    if (!towerStateMap.has(startKey) || !towerStateMap.has(goalKey)) throw new RangeError("Unknown Tower state");
    if (startKey === goalKey) return { distance: 0, path: [], states: [cloneState(parseState(startKey))] };
    const queue = [startKey];
    const seen = new Set([startKey]);
    const parent = new Map();
    while (queue.length) {
      const key = queue.shift();
      for (const move of towerAdjacency.get(key)) {
        if (seen.has(move.key)) continue;
        seen.add(move.key);
        parent.set(move.key, { key, move });
        if (move.key === goalKey) {
          const path = [];
          let cursor = goalKey;
          while (cursor !== startKey) {
            const step = parent.get(cursor);
            path.push({
              from: step.move.from,
              to: step.move.to,
              ball: step.move.ball,
              ballColor: step.move.ballColor,
              key: step.move.key,
              state: cloneState(step.move.state)
            });
            cursor = step.key;
          }
          path.reverse();
          return {
            distance: path.length,
            path,
            states: [cloneState(parseState(startKey)), ...path.map(step => cloneState(step.state))]
          };
        }
        queue.push(move.key);
      }
    }
    throw new Error("Tower state graph is disconnected");
  }

  const towerDistances = new Map();
  const towerPairsByDistance = new Map();
  let towerDiameter = 0;
  for (const startState of towerStates) {
    const startKey = serializeState(startState);
    for (const goalState of towerStates) {
      const goalKey = serializeState(goalState);
      const solution = solveTower(startKey, goalKey);
      towerDistances.set(`${startKey}>${goalKey}`, solution.distance);
      if (solution.distance > towerDiameter) towerDiameter = solution.distance;
      if (!towerPairsByDistance.has(solution.distance)) towerPairsByDistance.set(solution.distance, []);
      towerPairsByDistance.get(solution.distance).push({ startKey, goalKey });
    }
  }

  function generateTowerPair({ minMoves, maxMoves, rng = Math.random, used = null }) {
    const distances = range(minMoves, maxMoves).filter(distance => distance > 0 && towerPairsByDistance.has(distance));
    if (!distances.length) throw new RangeError("Requested Tower difficulty is not available");
    const pool = shuffle(distances, rng).flatMap(distance =>
      shuffle(towerPairsByDistance.get(distance), rng).map(pair => ({ ...pair, distance })));
    for (const pair of pool) {
      const key = `${pair.startKey}>${pair.goalKey}`;
      if (used?.has(key)) continue;
      used?.add(key);
      const solution = solveTower(pair.startKey, pair.goalKey);
      return {
        initialKey: pair.startKey,
        goalKey: pair.goalKey,
        initialState: cloneState(parseState(pair.startKey)),
        goalState: cloneState(parseState(pair.goalKey)),
        optimalMoves: solution.distance,
        path: solution.path.map(step => ({ from: step.from + 1, to: step.to + 1, ball: step.ball, ballColor: step.ballColor }))
      };
    }
    const fallback = pick(pool, rng);
    const solution = solveTower(fallback.startKey, fallback.goalKey);
    return {
      initialKey: fallback.startKey,
      goalKey: fallback.goalKey,
      initialState: cloneState(parseState(fallback.startKey)),
      goalState: cloneState(parseState(fallback.goalKey)),
      optimalMoves: solution.distance,
      path: solution.path.map(step => ({ from: step.from + 1, to: step.to + 1, ball: step.ball, ballColor: step.ballColor }))
    };
  }

  function evaluateTowerPlan(start, goal, plan, moveCap) {
    const startKey = typeof start === "string" ? start : serializeState(start);
    const goalKey = typeof goal === "string" ? goal : serializeState(goal);
    if (!towerStateMap.has(startKey) || !towerStateMap.has(goalKey)) throw new RangeError("Unknown Tower state");
    if (!Array.isArray(plan) || !Number.isInteger(moveCap) || moveCap < 1 || plan.length > moveCap) {
      throw new RangeError("Tower plan must fit within its move limit");
    }
    let state = parseState(startKey);
    const states = [cloneState(state)], moves = [];
    let firstInvalid = null;
    for (let index = 0; index < plan.length; index++) {
      const { from, to } = plan[index] || {};
      const type = towerMoveError(state, from - 1, to - 1);
      if (type) {
        firstInvalid = { index: index + 1, from, to, type };
        break;
      }
      const move = moveBall(state, from - 1, to - 1);
      state = move.state;
      moves.push({ from, to, ball: move.ball, ballColor: move.ballColor });
      states.push(cloneState(state));
    }
    return {
      solved: plan.length > 0 && !firstInvalid && serializeState(state) === goalKey,
      finalState: cloneState(state), states, moves, firstInvalid
    };
  }

  function drawTowerBall(g, ball, x, y) {
    g.beginPath();
    g.fillStyle = D.palette[TOWER_BALLS[ball] === "red" ? "stim-red" : TOWER_BALLS[ball] === "green" ? "stim-green" : "stim-blue"];
    g.strokeStyle = D.palette["task-fg"];
    g.lineWidth = 2;
    g.arc(x, y, 15, 0, Math.PI * 2);
    g.fill();
    g.stroke();
  }

  function renderTowerBoard(state, selectedPeg = -1) {
    const width = 320, height = 220;
    const pegX = [70, 160, 250];
    const baseY = 176;
    const slotGap = 34;
    const pegHeights = [105, 70, 35];
    return makeCanvas(width, height, g => {
      g.strokeStyle = D.palette["task-fg"];
      g.fillStyle = D.palette["task-fg"];
      g.lineWidth = 4;
      g.beginPath();
      g.moveTo(25, baseY + 14);
      g.lineTo(width - 25, baseY + 14);
      g.stroke();
      for (let peg = 0; peg < 3; peg++) {
        g.strokeStyle = selectedPeg === peg ? D.palette["stim-yellow"] : D.palette["task-fg"];
        g.lineWidth = selectedPeg === peg ? 8 : 4;
        g.beginPath();
        g.moveTo(pegX[peg], baseY + 14);
        g.lineTo(pegX[peg], baseY - pegHeights[peg]);
        g.stroke();
        g.fillStyle = D.palette["task-fg"];
        g.font = '600 18px "Segoe UI", Aptos, Calibri, sans-serif';
        g.textAlign = "center";
        g.textBaseline = "middle";
        g.fillText(String(peg + 1), pegX[peg], 204);
      }
      for (let peg = 0; peg < 3; peg++) {
        state[peg].forEach((ball, index) => {
          drawTowerBall(g, ball, pegX[peg], baseY - index * slotGap);
        });
      }
    });
  }

  function towerFrameCanvas(moveCap, portrait, currentLabel = "tower.current") {
    return makeCanvas(portrait ? 340 : 700, portrait ? 590 : 300, (g, w, h) => {
      g.fillStyle = D.palette["task-bg"];
      g.fillRect(0, 0, w, h);
      g.fillStyle = D.palette["task-fg"];
      g.font = '600 26px "Segoe UI", Aptos, Calibri, sans-serif';
      g.textAlign = "center";
      g.textBaseline = "middle";
      g.fillText(C.t("tower.goal"), portrait ? w / 2 : 175, 22);
      g.fillText(C.t(currentLabel), portrait ? w / 2 : 525, portrait ? 298 : 22);
      g.font = '500 20px "Segoe UI", Aptos, Calibri, sans-serif';
      g.fillText(C.t("tower.moveLimit", { count: C.number(moveCap, 0) }), w / 2, h - 11);
      g.fillStyle = D.palette["task-panel"];
      g.strokeStyle = D.palette["stim-gray"];
      g.lineWidth = 2;
      g.fillRect(5, 44, 335, 232);
      g.strokeRect(5, 44, 335, 232);
      g.fillRect(portrait ? 5 : 360, portrait ? 320 : 44, 335, 232);
      g.strokeRect(portrait ? 5 : 360, portrait ? 320 : 44, 335, 232);
    }, true);
  }

  function makeTowerSceneFactory(goalKey, boardCache, frame, portrait) {
    const getBoard = (key, selectedPeg) => {
      const cacheKey = `${key}|${selectedPeg}`;
      if (!boardCache.has(cacheKey)) boardCache.set(cacheKey, renderTowerBoard(parseState(key), selectedPeg));
      return boardCache.get(cacheKey);
    };
    const sceneCache = new Map();
    return (key, selectedPeg = -1) => {
      const cacheKey = `${key}|${selectedPeg}`;
      if (!sceneCache.has(cacheKey)) {
        const goalBoard = getBoard(goalKey, -1), currentBoard = getBoard(key, selectedPeg);
        sceneCache.set(cacheKey, {
          width: frame.width,
          height: frame.height,
          layers: [
            { scene: frame, x: 0, y: 0, width: frame.width, height: frame.height },
            { scene: goalBoard, x: 12, y: 50, width: goalBoard.width, height: goalBoard.height },
            { scene: currentBoard, x: portrait ? 12 : 368, y: portrait ? 326 : 50, width: currentBoard.width, height: currentBoard.height }
          ]
        });
      }
      return sceneCache.get(cacheKey);
    };
  }

  async function replayTowerPlan(ctx, item, evaluation, portrait, boardCache) {
    const sceneFor = makeTowerSceneFactory(item.goalKey, boardCache,
      towerFrameCanvas(item.moveCap, portrait, "tower.replay"), portrait);
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    await ctx.show(sceneFor(item.initialKey), 350);
    for (let index = 0; index < evaluation.moves.length; index++) {
      const move = evaluation.moves[index], before = evaluation.states[index];
      const nextKey = serializeState(evaluation.states[index + 1]);
      if (reducedMotion) {
        await ctx.show(sceneFor(nextKey), 350);
        continue;
      }
      const from = move.from - 1, to = move.to - 1, pegX = [70, 160, 250];
      const lifted = cloneState(before);
      lifted[from].pop();
      const liftedBoard = renderTowerBoard(lifted);
      const board = makeCanvas(liftedBoard.width, liftedBoard.height, () => {});
      const g = board.getContext("2d");
      const points = [[pegX[from], 176 - (before[from].length - 1) * 34],
        [pegX[from], 40], [pegX[to], 40], [pegX[to], 176 - before[to].length * 34]];
      const scene = sceneFor(serializeState(before));
      const start = await C.Timing.frame();
      ctx.check();
      let time = start;
      do {
        const progress = Math.min(1, (time - start) / 500) * 3;
        const segment = Math.min(2, Math.floor(progress)), part = progress - segment;
        const eased = part * part * (3 - 2 * part);
        const [x, y] = points[segment].map((value, axis) =>
          value + (points[segment + 1][axis] - value) * eased);
        g.clearRect(0, 0, board.width, board.height);
        g.drawImage(liftedBoard, 0, 0);
        drawTowerBall(g, move.ball, x, y);
        ctx.paint({ ...scene, layers: [scene.layers[0], scene.layers[1], { ...scene.layers[2], scene: board }] });
        if (progress === 3) break;
        time = await C.Timing.frame();
        ctx.check();
      } while (true);
      await ctx.show(sceneFor(nextKey), 100);
    }
    await ctx.show(sceneFor(item.goalKey), 650);
  }

  function towerPlanFeedback(scene, row) {
    const error = row.invalidAttempts[0];
    const message = C.t(error ? `tower.error.${error.type}` : row.endReason === "timeout" ? "tower.timeout" : "tower.notSolved",
      { count: C.number(error?.index), peg: C.number(error?.type === "empty-source" ? error.from : error?.to) });
    const caption = D.scene((g, w) => {
      g.font = '600 18px "Segoe UI", Aptos, Calibri, sans-serif';
      g.fillText(message, w / 2, 28, w - 16);
    }, scene.width, 56);
    return { message, scene: { ...scene, height: scene.height + caption.height,
      layers: [...scene.layers, { scene: caption, x: 0, y: scene.height, width: caption.width, height: caption.height }] } };
  }

  async function runTowerPlan(ctx, item, panel, practice, portrait, boardCache) {
    const plan = [], frozenScene = item.sceneFor(item.initialKey);
    let selectedPeg = -1, evaluation = null, submittedAt = null;
    const status = ctx.responseStatus;
    status.classList.add("tower-plan");
    status.style.bottom = `${ctx.h - panel.top + 12}px`;
    const showPlan = (hint = null) => {
      const moves = plan.map((move, index) => `${C.number(index + 1)}: ${move.from} → ${move.to}`);
      if (selectedPeg !== -1) moves.push(`${C.number(plan.length + 1)}: ${selectedPeg + 1} → ?`);
      status.textContent = [C.t("tower.plan", { count: C.number(plan.length), limit: C.number(item.moveCap) }),
        moves.join(" · ") || C.t("tower.planEmpty"), hint ? C.t(hint) : ""].filter(Boolean).join("\n");
      status.scrollTop = status.scrollHeight;
    };
    let row;
    try {
      row = await ctx.trial({
        scene: frozenScene, panel, deadline: ctx.params.responseMs, rtOnSubmit: true, noFeedback: true,
        onset: () => showPlan(),
        evaluate: () => Boolean(evaluation?.solved),
        interact(value, time, current) {
          let hint = null;
          if (value === "back") {
            if (selectedPeg !== -1) selectedPeg = -1;
            else { plan.pop(); current.responses.pop(); }
          } else if (value === "done") {
            if (selectedPeg !== -1) hint = "tower.finishMove";
            else if (!plan.length) hint = "tower.enterMoves";
            else {
              submittedAt = time;
              evaluation = evaluateTowerPlan(item.initialKey, item.goalKey, plan, item.moveCap);
              return { accepted: false, done: true, scene: frozenScene };
            }
          } else if (plan.length >= item.moveCap) hint = "tower.planFull";
          else if (selectedPeg === -1) selectedPeg = value;
          else if (selectedPeg === value) selectedPeg = -1;
          else {
            const move = { from: selectedPeg + 1, to: value + 1 };
            plan.push(move);
            selectedPeg = -1;
            showPlan();
            return { accepted: true, recordValue: { ...move }, scene: frozenScene };
          }
          showPlan(hint);
          return { accepted: false, scene: frozenScene };
        },
        meta: {
          initialState: cloneState(item.initialState), goalState: cloneState(item.goalState),
          optimalMoves: item.optimalMoves, optimalPath: item.path.map(step => ({ ...step })),
          moveCap: item.moveCap, condition: item.optimalMoves, planningMode: "mental"
        },
        enrich(result) {
          result.submittedPlan = submittedAt !== null;
          result.planSubmissionLatencyMs = submittedAt === null ? null : submittedAt - result.responseWindowOnset;
          result.plannedMoves = plan.map(move => ({ ...move }));
          result.pendingSourcePeg = selectedPeg === -1 ? null : selectedPeg + 1;
          result.finalState = cloneState(evaluation?.finalState || item.initialState);
          result.actualLegalMoves = evaluation?.moves.length || 0;
          result.moveLog = evaluation?.moves.map(move => ({ ...move })) || [];
          result.invalidAttempts = evaluation?.firstInvalid ? [{ ...evaluation.firstInvalid }] : [];
          result.solved = Boolean(evaluation?.solved);
          result.firstMoveLatencyMs = result.actualLegalMoves ? result.responses[0].time - result.responseWindowOnset : null;
          result.endReason = result.solved ? "solved" : submittedAt === null ? "timeout" :
            evaluation.firstInvalid ? "illegal-move" : "not-solved";
          result.excessMoves = result.solved ? result.actualLegalMoves - item.optimalMoves : null;
        }
      });
    } finally {
      status.textContent = "";
      status.classList.remove("tower-plan");
      status.style.bottom = "";
    }
    if (practice || ctx.mode === "training") {
      if (row.solved) await replayTowerPlan(ctx, item, evaluation, portrait, boardCache);
      else {
        const sceneFor = makeTowerSceneFactory(item.goalKey, boardCache, towerFrameCanvas(item.moveCap, portrait), portrait);
        const feedback = towerPlanFeedback(sceneFor(serializeState(row.finalState)), row);
        const showing = ctx.show(feedback.scene, 1800);
        status.classList.add("visually-hidden");
        status.textContent = feedback.message;
        try { await showing; }
        finally { status.textContent = ""; status.classList.remove("visually-hidden"); }
      }
    }
    return row;
  }

  const rotationMetric = (rows, angle) => {
    const valid = S.eligible(normalizeRows(rows)).filter(row => row.angleDeg === angle);
    return valid.length ? S.mean(valid.map(row => Number(row.correct))) : null;
  };
  const towerScore = rows => {
    const valid = S.eligible(normalizeRows(rows));
    const solved = valid.filter(row => row.solved);
    return {
      ...C.accuracyScore(rows),
      optimalSolutions: solved.filter(row => row.actualLegalMoves === row.optimalMoves).length,
      meanExcessMoves: solved.length ? S.mean(solved.map(row => row.actualLegalMoves - row.optimalMoves)) : null,
      optimalMoveEfficiency: valid.length ? S.mean(valid.map(row =>
        row.solved && row.actualLegalMoves ? row.optimalMoves / row.actualLegalMoves : 0)) : null,
      meanFirstMoveLatency: meanFinite(valid.map(row => row.firstMoveLatencyMs))
    };
  };
  const rotationScore = rows => ({
    ...C.accuracyScore(rows),
    angle90Accuracy: rotationMetric(rows, 90),
    angle120Accuracy: rotationMetric(rows, 120),
    angle180Accuracy: rotationMetric(rows, 180)
  });

  C.Rotation = {
    rotations: rotations.map(matrix => matrix.map(row => row.slice())),
    apply: (matrix, cell) => applyMatrix(matrix, cell),
    rotate: (cells, matrix) => rotateCells(cells, matrix),
    reflect: cells => normalizeCellsInternal(reflectCells(cells)),
    canonical: canonicalCells,
    serialize: serializeCells,
    connected: connectedCells,
    extents,
    projectionSignature,
    angle: rotationAngleDeg,
    allowedAngles,
    generate: (blockCount, rng = Math.random) => randomFigure(blockCount, rng),
    generatePair: options => generateRotationPair(options)
  };

  C.Tower = {
    capacities: TOWER_CAPACITIES.slice(),
    balls: TOWER_BALLS.slice(),
    states: towerStates.map(cloneState),
    serialize: serializeState,
    parse: parseState,
    move: (state, from, to) => {
      const moved = moveBall(typeof state === "string" ? parseState(state) : cloneState(state), from, to);
      return moved ? { ...moved, state: cloneState(moved.state) } : null;
    },
    neighbors: state => towerNeighbors(typeof state === "string" ? parseState(state) : state)
      .map(move => ({ ...move, state: cloneState(move.state) })),
    solve: (start, goal) => solveTower(start, goal),
    distance: (start, goal) => towerDistances.get(`${typeof start === "string" ? start : serializeState(start)}>${typeof goal === "string" ? goal : serializeState(goal)}`),
    generate: options => generateTowerPair(options),
    evaluatePlan: evaluateTowerPlan,
    diameter: towerDiameter
  };

  C.define("mental-rotation", "reasoning", {
    trials: p(24, 6, 72, 6),
    blockCount: p(5, 4, 10),
    minAngleDeg: p(90, 90, 180, 30),
    maxAngleDeg: p(180, 90, 180, 30),
    responseMs: p(8000, 2000, 20000, 500)
  }, {
    tier: 2,
    landscape: true,
    primaryMetric: "accuracy",
    metrics: ["accuracy", "correct", "angle90Accuracy", "angle120Accuracy", "angle180Accuracy"],
    staircase: "stepwise",
    validateParams: q => q.minAngleDeg > q.maxAngleDeg || !allowedAngles(q.minAngleDeg, q.maxAngleDeg).length ? "rotation.invalidAngles" : null,
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice";
      const count = practice ? PRACTICE_TRIALS : q.trials;
      if (!count) return { stimulusSet: "spatial" };
      const panel = ctx.prepareOptions(D.options([C.t("response.same"), C.t("response.different")], ["a", "l"]));
      const mainAngles = allowedAngles(q.minAngleDeg, q.maxAngleDeg);
      const state = ctx.state("rotation-angle-index", "stepwise", { start: 0, min: 0, max: mainAngles.length - 1 });
      const portrait = ctx.w < 600 && ctx.h >= ctx.w;
      const frame = rotationFrameCanvas(portrait);
      const figureCache = new Map();
      const rasterScale = Math.min(1, (ctx.w - 24) / frame.width, ctx.stimulusHeight / frame.height);
      const figureScene = cells => {
        const key = serializeCells(cells);
        if (!figureCache.has(key)) figureCache.set(key, renderRotationFigure(cells, rasterScale));
        return figureCache.get(key);
      };
      const itemScene = item => makeRotationScene(frame, figureScene(item.leftCells), figureScene(item.rightCells), portrait);
      const makeRotationItem = spec => {
        const item = generateRotationPair(spec);
        return { ...item, scene: itemScene(item) };
      };
      const practicePlan = [
        { blockCount: 4, angleDeg: 90, same: true },
        { blockCount: 4, angleDeg: 90, same: false },
        { blockCount: 4, angleDeg: 120, same: true },
        { blockCount: 4, angleDeg: 120, same: false },
        { blockCount: 5, angleDeg: 90, same: true },
        { blockCount: 5, angleDeg: 90, same: false },
        { blockCount: 5, angleDeg: 120, same: true },
        { blockCount: 5, angleDeg: 120, same: false }
      ];
      const assessmentItems = !practice && ctx.mode === "assessment" ? shuffle(Array.from({ length: q.trials }, (_, i) => ({
        angleDeg: mainAngles[i % mainAngles.length],
        same: i < Math.ceil(q.trials / 2)
      }))) : [];
      const trainingFlags = !practice ? shuffle(Array.from({ length: q.trials }, (_, i) => i < Math.ceil(q.trials / 2))) : [];
      await ctx.countdown();
      const recent = [];
      for (let index = 0; index < count; index++) {
        const spec = practice ? practicePlan[index] : ctx.mode === "assessment" ? { ...assessmentItems[index], blockCount: q.blockCount } : (() => {
          const angleDeg = mainAngles[Math.round(state.state.value)];
          const same = trainingFlags[index];
          return { angleDeg, same, blockCount: q.blockCount };
        })();
        if (figureCache.size > 32) figureCache.clear();
        const item = makeRotationItem(spec);
        const row = await ctx.trial({
          scene: item.scene,
          panel,
          deadline: q.responseMs,
          answer: item.answer,
          noFeedback: !practice && ctx.mode === "assessment",
          meta: {
            blockCount: item.blockCount,
            figure: cloneCells(item.cells),
            mirroredFigure: cloneCells(item.mirroredCells),
            canonical: item.canonical,
            same: item.same,
            angleDeg: item.angleDeg,
            leftRotationIndex: item.leftRotationIndex,
            rightRotationIndex: item.rightRotationIndex,
            leftRotation: item.leftRotation.map(row => row.slice()),
            rightRotation: item.rightRotation.map(row => row.slice()),
            leftFigure: cloneCells(item.leftCells),
            rightFigure: cloneCells(item.rightCells),
            reflectionFlag: !item.same,
            condition: item.angleDeg
          }
        });
        recent.push(row);
        if (!practice && ctx.mode === "training" && recent.length === 4) {
          ctx.adapt(state, {
            accuracy: S.accuracy(normalizeRows(recent)),
            errors: recent.filter(entry => !entry.correct).length,
            up: .85,
            down: .55,
            downErrors: 2
          });
          recent.length = 0;
        }
      }
      return { stimulusSet: "spatial" };
    },
    score: rotationScore
  });

  C.define("tower-london", "reasoning", {
    planningMode: choice(["visible", "mental"]),
    trials: p(18, 3, 60, 3),
    startMoves: p(2, 1, towerDiameter),
    minMoves: p(1, 1, towerDiameter),
    maxMoves: p(6, 1, towerDiameter),
    maxExtraMoves: p(3, 0, 10),
    responseMs: p(30000, 5000, 120000, 1000)
  }, {
    tier: 2,
    landscape: true,
    primaryMetric: "accuracy",
    metrics: ["accuracy", "optimalSolutions", "meanExcessMoves", "optimalMoveEfficiency", "meanFirstMoveLatency"],
    staircase: "stepwise",
    validateParams: q => q.minMoves > q.startMoves || q.startMoves > q.maxMoves || q.maxMoves > towerDiameter ? "tower.invalidRange" : null,
    async run(ctx) {
      const q = ctx.params, practice = ctx.phase === "practice", mental = q.planningMode === "mental";
      const count = practice ? PRACTICE_TRIALS : q.trials;
      if (!count) return { stimulusSet: "spatial" };
      const options = D.options(["1", "2", "3"], ["1", "2", "3"]);
      if (mental) options.push({ value: "back", key: "Backspace", label: C.t("tower.undo") },
        { value: "done", key: "Enter", label: C.t("tower.submit") });
      const panel = ctx.prepareOptions(options, mental ? "tower-plan" : "standard");
      if (mental) panel.statusHeight = 104;
      const state = ctx.state("tower-distance", "stepwise", { start: q.startMoves, min: q.minMoves, max: q.maxMoves });
      const boardCache = new Map();
      const portrait = ctx.w < 600 && ctx.h >= ctx.w;
      const frames = new Map(range(1, towerDiameter).map(distance =>
        [distance, towerFrameCanvas(distance + q.maxExtraMoves, portrait, mental ? "tower.start" : "tower.current")]));
      const sceneFactories = new Map();
      const usedPairs = new Set();
      const practiceDistances = [1, 1, 2, 2, 3, 3, 2, 3];
      const makeItem = distance => {
        const generated = generateTowerPair({ minMoves: distance, maxMoves: distance, used: usedPairs });
        const sceneKey = `${generated.goalKey}|${distance}`;
        if (!sceneFactories.has(sceneKey)) sceneFactories.set(sceneKey,
          makeTowerSceneFactory(generated.goalKey, boardCache, frames.get(distance), portrait));
        return {
          ...generated,
          moveCap: generated.optimalMoves + q.maxExtraMoves,
          sceneFor: sceneFactories.get(sceneKey)
        };
      };
      const mainDistances = range(q.minMoves, q.maxMoves);
      const assessmentDistances = !practice ? shuffle(Array.from({ length: q.trials }, (_, i) => mainDistances[i % mainDistances.length])) : [];
      await ctx.countdown();
      const recent = [];
      for (let index = 0; index < count; index++) {
        const distance = practice ? practiceDistances[index] : ctx.mode === "assessment" ? assessmentDistances[index] : Math.round(state.state.value);
        const item = makeItem(distance);
        let currentKey = item.initialKey;
        let selectedPeg = -1;
        let endReason = null;
        const invalidAttempts = [];
        const row = mental ? await runTowerPlan(ctx, item, panel, practice, portrait, boardCache) : await ctx.trial({
          scene: item.sceneFor(currentKey, selectedPeg),
          panel,
          deadline: q.responseMs,
          noFeedback: !practice && ctx.mode === "assessment",
          evaluate: () => currentKey === item.goalKey,
          interact(value, time, current) {
            const peg = value;
            const offset = time - current.startedAt;
            if (selectedPeg === -1) {
              if (!parseState(currentKey)[peg].length) {
                invalidAttempts.push({ peg: peg + 1, type: "empty-source", timeOffsetMs: offset });
                return { accepted: false, scene: item.sceneFor(currentKey, -1), entered: [peg + 1, "∅"] };
              }
              selectedPeg = peg;
              return { accepted: false, scene: item.sceneFor(currentKey, selectedPeg), entered: [peg + 1, "→", "?"] };
            }
            if (peg === selectedPeg) {
              selectedPeg = -1;
              return { accepted: false, scene: item.sceneFor(currentKey, -1), entered: [peg + 1, "×"] };
            }
            const move = moveBall(parseState(currentKey), selectedPeg, peg);
            if (!move) {
              invalidAttempts.push({ from: selectedPeg + 1, to: peg + 1, type: "illegal-destination", timeOffsetMs: offset });
              return { accepted: false, scene: item.sceneFor(currentKey, selectedPeg), entered: [selectedPeg + 1, "→", peg + 1, "×"] };
            }
            const from = selectedPeg;
            selectedPeg = -1;
            currentKey = move.key;
            const actualMoves = current.responses.length + 1;
            const solved = currentKey === item.goalKey;
            if (solved) endReason = "solved";
            else if (actualMoves >= item.moveCap) endReason = "move-cap";
            return {
              accepted: true,
              recordValue: { from: from + 1, to: peg + 1, ball: move.ball, ballColor: move.ballColor },
              scene: item.sceneFor(currentKey, -1),
              done: solved || actualMoves >= item.moveCap,
              entered: [from + 1, "→", peg + 1]
            };
          },
          meta: {
            initialState: cloneState(item.initialState),
            goalState: cloneState(item.goalState),
            optimalMoves: item.optimalMoves,
            optimalPath: item.path.map(step => ({ ...step })),
            moveCap: item.moveCap,
            planningMode: "visible",
            condition: item.optimalMoves
          },
          enrich(result) {
            result.initialState = cloneState(item.initialState);
            result.goalState = cloneState(item.goalState);
            result.finalState = cloneState(parseState(currentKey));
            result.actualLegalMoves = result.responses.length;
            result.moveLog = result.response.map(step => ({ ...step }));
            result.invalidAttempts = invalidAttempts.map(entry => ({ ...entry }));
            result.solved = currentKey === item.goalKey;
            result.firstMoveLatencyMs = result.rtMs;
            result.endReason = result.solved ? "solved" :
              result.actualLegalMoves >= item.moveCap ? "move-cap" : endReason || "timeout";
            result.excessMoves = result.solved ? result.actualLegalMoves - item.optimalMoves : null;
          }
        });
        recent.push(row);
        if (!practice && ctx.mode === "training" && recent.length === 2) {
          ctx.adapt(state, {
            accuracy: S.mean(recent.map(entry => entry.solved && entry.actualLegalMoves ? entry.optimalMoves / entry.actualLegalMoves : 0)),
            errors: recent.filter(entry => !entry.solved).length,
            up: .92,
            down: .6,
            downErrors: 1
          });
          recent.length = 0;
        }
      }
      return { stimulusSet: "spatial" };
    },
    score: towerScore
  });
})();
