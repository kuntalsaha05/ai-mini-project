import {
  Loader2,
  Pause,
  Play,
  RotateCcw,
  Shuffle,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { addStat } from "../utils/statistics";

type Cell = {
  visited: boolean;
  walls: { N: boolean; S: boolean; E: boolean; W: boolean };
};

type MazeGrid = Cell[][];

type AnimState = {
  explored: Set<string>;
  path: [number, number][];
};

type SearchResult = {
  order: [number, number][];
  path: [number, number][];
  rlStats?: {
    episodes: number;
    bestReward: number;
    finalEpsilon: number;
    fallbackUsed?: boolean;
  };
};

type Direction = "N" | "S" | "E" | "W";
type MazeGenerator = "backtracking" | "prim";

interface MazeSolverProps {
  isDark: boolean;
}

const SIZES: Record<string, { rows: number; cols: number }> = {
  small: { rows: 10, cols: 10 },
  medium: { rows: 15, cols: 15 },
  large: { rows: 20, cols: 20 },
};

const SPEEDS = { slow: 80, medium: 30, fast: 8 };
const RL_PRESETS = {
  quick: 100,
  balanced: 300,
  deep: 800,
} as const;

function buildPath(
  parent: Map<string, [number, number] | null>,
  goal: [number, number],
): [number, number][] {
  const goalKey = `${goal[0]},${goal[1]}`;
  if (!parent.has(goalKey)) return [];

  const path: [number, number][] = [];
  let cur: [number, number] | null | undefined = goal;
  while (cur != null) {
    path.unshift(cur);
    cur = parent.get(`${cur[0]},${cur[1]}`);
  }

  return path.length > 1 ? path : [];
}

function qKey(r: number, c: number, d: Direction) {
  return `${r},${c}|${d}`;
}

function getNeighbors(maze: MazeGrid, rows: number, cols: number, r: number, c: number) {
  const cell = maze[r][c];
  const candidates: [Direction, number, number][] = [
    ["N", r - 1, c],
    ["S", r + 1, c],
    ["E", r, c + 1],
    ["W", r, c - 1],
  ];

  return candidates.filter(([dir, nr, nc]) => {
    return nr >= 0 && nr < rows && nc >= 0 && nc < cols && !cell.walls[dir];
  });
}

function initGrid(rows: number, cols: number): MazeGrid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      visited: false,
      walls: { N: true, S: true, E: true, W: true },
    })),
  );
}

function generateMazeBacktracking(rows: number, cols: number): MazeGrid {
  const grid = initGrid(rows, cols);

  function carve(r: number, c: number) {
    grid[r][c].visited = true;
    const dirs: ["N" | "S" | "E" | "W", number, number][] = [
      ["N", -1, 0],
      ["S", 1, 0],
      ["E", 0, 1],
      ["W", 0, -1],
    ];
    // Shuffle
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }
    for (const [dir, dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (
        nr >= 0 &&
        nr < rows &&
        nc >= 0 &&
        nc < cols &&
        !grid[nr][nc].visited
      ) {
        const opp: Record<string, "N" | "S" | "E" | "W"> = {
          N: "S",
          S: "N",
          E: "W",
          W: "E",
        };
        grid[r][c].walls[dir] = false;
        grid[nr][nc].walls[opp[dir]] = false;
        carve(nr, nc);
      }
    }
  }

  carve(0, 0);
  return grid;
}

function generateMazePrim(rows: number, cols: number): MazeGrid {
  const grid = initGrid(rows, cols);
  const inMaze = new Set<string>();
  const frontier: [number, number, number, number][] = [];

  const addFrontier = (r: number, c: number) => {
    const dirs: [number, number][] = [
      [-1, 0],
      [1, 0],
      [0, 1],
      [0, -1],
    ];

    for (const [dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !inMaze.has(`${nr},${nc}`)) {
        frontier.push([r, c, nr, nc]);
      }
    }
  };

  const removeWallBetween = (r1: number, c1: number, r2: number, c2: number) => {
    if (r2 === r1 - 1) {
      grid[r1][c1].walls.N = false;
      grid[r2][c2].walls.S = false;
    } else if (r2 === r1 + 1) {
      grid[r1][c1].walls.S = false;
      grid[r2][c2].walls.N = false;
    } else if (c2 === c1 + 1) {
      grid[r1][c1].walls.E = false;
      grid[r2][c2].walls.W = false;
    } else if (c2 === c1 - 1) {
      grid[r1][c1].walls.W = false;
      grid[r2][c2].walls.E = false;
    }
  };

  inMaze.add("0,0");
  grid[0][0].visited = true;
  addFrontier(0, 0);

  while (frontier.length > 0) {
    const idx = Math.floor(Math.random() * frontier.length);
    const [pr, pc, r, c] = frontier.splice(idx, 1)[0];
    const key = `${r},${c}`;
    if (inMaze.has(key)) continue;

    removeWallBetween(pr, pc, r, c);
    inMaze.add(key);
    grid[r][c].visited = true;
    addFrontier(r, c);
  }

  return grid;
}

function generateMaze(rows: number, cols: number, generator: MazeGenerator): MazeGrid {
  return generator === "prim"
    ? generateMazePrim(rows, cols)
    : generateMazeBacktracking(rows, cols);
}

function bfsSearch(
  maze: MazeGrid,
  rows: number,
  cols: number,
): SearchResult {
  const goal: [number, number] = [rows - 1, cols - 1];
  const queue: [number, number][] = [[0, 0]];
  const visited = new Set<string>();
  const parent = new Map<string, [number, number] | null>();
  visited.add("0,0");
  parent.set("0,0", null);
  const order: [number, number][] = [];

  while (queue.length > 0) {
    const [r, c] = queue.shift()!;
    order.push([r, c]);
    if (r === goal[0] && c === goal[1]) break;
    const cell = maze[r][c];
    const neighbors: ["N" | "S" | "E" | "W", number, number][] = [
      ["N", r - 1, c],
      ["S", r + 1, c],
      ["E", r, c + 1],
      ["W", r, c - 1],
    ];
    for (const [dir, nr, nc] of neighbors) {
      const key = `${nr},${nc}`;
      if (
        nr >= 0 &&
        nr < rows &&
        nc >= 0 &&
        nc < cols &&
        !cell.walls[dir] &&
        !visited.has(key)
      ) {
        visited.add(key);
        parent.set(key, [r, c]);
        queue.push([nr, nc]);
      }
    }
  }

  return { order, path: buildPath(parent, goal) };
}

function dfsSearch(
  maze: MazeGrid,
  rows: number,
  cols: number,
): SearchResult {
  const goal: [number, number] = [rows - 1, cols - 1];
  const stack: [number, number][] = [[0, 0]];
  const visited = new Set<string>();
  const parent = new Map<string, [number, number] | null>();
  parent.set("0,0", null);
  const order: [number, number][] = [];

  while (stack.length > 0) {
    const [r, c] = stack.pop()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;

    visited.add(key);
    order.push([r, c]);
    if (r === goal[0] && c === goal[1]) break;

    const neighbors = getNeighbors(maze, rows, cols, r, c).reverse();
    for (const [, nr, nc] of neighbors) {
      const nkey = `${nr},${nc}`;
      if (visited.has(nkey)) continue;
      if (!parent.has(nkey)) parent.set(nkey, [r, c]);
      stack.push([nr, nc]);
    }
  }

  return { order, path: buildPath(parent, goal) };
}

function astarSearch(
  maze: MazeGrid,
  rows: number,
  cols: number,
): SearchResult {
  const goal: [number, number] = [rows - 1, cols - 1];
  const heuristic = (r: number, c: number) =>
    Math.abs(r - goal[0]) + Math.abs(c - goal[1]);

  type PQItem = { f: number; r: number; c: number };
  const openSet: PQItem[] = [{ f: heuristic(0, 0), r: 0, c: 0 }];
  const gScore = new Map<string, number>();
  gScore.set("0,0", 0);
  const parent = new Map<string, [number, number] | null>();
  parent.set("0,0", null);
  const closed = new Set<string>();
  const order: [number, number][] = [];

  while (openSet.length > 0) {
    openSet.sort((a, b) => a.f - b.f);
    const { r, c } = openSet.shift()!;
    const key = `${r},${c}`;
    if (closed.has(key)) continue;
    closed.add(key);
    order.push([r, c]);

    if (r === goal[0] && c === goal[1]) break;

    const cell = maze[r][c];
    const neighbors: ["N" | "S" | "E" | "W", number, number][] = [
      ["N", r - 1, c],
      ["S", r + 1, c],
      ["E", r, c + 1],
      ["W", r, c - 1],
    ];
    for (const [dir, nr, nc] of neighbors) {
      const nkey = `${nr},${nc}`;
      if (
        nr >= 0 &&
        nr < rows &&
        nc >= 0 &&
        nc < cols &&
        !cell.walls[dir] &&
        !closed.has(nkey)
      ) {
        const g = (gScore.get(key) ?? Number.POSITIVE_INFINITY) + 1;
        if (g < (gScore.get(nkey) ?? Number.POSITIVE_INFINITY)) {
          gScore.set(nkey, g);
          parent.set(nkey, [r, c]);
          openSet.push({ f: g + heuristic(nr, nc), r: nr, c: nc });
        }
      }
    }
  }
  return { order, path: buildPath(parent, goal) };
}

function greedySearch(
  maze: MazeGrid,
  rows: number,
  cols: number,
): SearchResult {
  const goal: [number, number] = [rows - 1, cols - 1];
  const heuristic = (r: number, c: number) =>
    Math.abs(r - goal[0]) + Math.abs(c - goal[1]);

  const open: { h: number; r: number; c: number }[] = [{ h: heuristic(0, 0), r: 0, c: 0 }];
  const visited = new Set<string>();
  const parent = new Map<string, [number, number] | null>();
  parent.set("0,0", null);
  const order: [number, number][] = [];

  while (open.length > 0) {
    open.sort((a, b) => a.h - b.h);
    const { r, c } = open.shift()!;
    const key = `${r},${c}`;
    if (visited.has(key)) continue;

    visited.add(key);
    order.push([r, c]);
    if (r === goal[0] && c === goal[1]) break;

    for (const [, nr, nc] of getNeighbors(maze, rows, cols, r, c)) {
      const nkey = `${nr},${nc}`;
      if (visited.has(nkey)) continue;
      if (!parent.has(nkey)) parent.set(nkey, [r, c]);
      open.push({ h: heuristic(nr, nc), r: nr, c: nc });
    }
  }

  return { order, path: buildPath(parent, goal) };
}

function qLearningSearch(
  maze: MazeGrid,
  rows: number,
  cols: number,
  episodes: number,
  stepMultiplier = 4,
): SearchResult {
  const goal: [number, number] = [rows - 1, cols - 1];
  const q = new Map<string, number>();

  const alpha = 0.2;
  const gamma = 0.95;
  const epsilonStart = 1;
  const epsilonEnd = 0.05;
  const maxStepsPerEpisode = rows * cols * stepMultiplier;

  let bestReward = Number.NEGATIVE_INFINITY;
  let finalEpsilon = epsilonStart;

  for (let ep = 0; ep < episodes; ep++) {
    const epsilon =
      epsilonStart - (epsilonStart - epsilonEnd) * ((ep + 1) / episodes);
    finalEpsilon = epsilon;

    let r = 0;
    let c = 0;
    let rewardSum = 0;
    const episodeVisited = new Set<string>(["0,0"]);

    for (let step = 0; step < maxStepsPerEpisode; step++) {
      const neighbors = getNeighbors(maze, rows, cols, r, c);
      if (neighbors.length === 0) break;

      const chooseRandom = Math.random() < epsilon;
      let selected: [Direction, number, number];

      if (chooseRandom) {
        selected = neighbors[Math.floor(Math.random() * neighbors.length)];
      } else {
        selected = neighbors[0];
        let bestQ = q.get(qKey(r, c, selected[0])) ?? 0;
        for (let i = 1; i < neighbors.length; i++) {
          const candidate = neighbors[i];
          const candidateQ = q.get(qKey(r, c, candidate[0])) ?? 0;
          if (candidateQ > bestQ) {
            bestQ = candidateQ;
            selected = candidate;
          }
        }
      }

      const [action, nr, nc] = selected;
      const reachedGoal = nr === goal[0] && nc === goal[1];
      const isRevisit = episodeVisited.has(`${nr},${nc}`);
      const reward = reachedGoal ? 100 : isRevisit ? -3 : -1;

      const currentQ = q.get(qKey(r, c, action)) ?? 0;
      const nextNeighbors = getNeighbors(maze, rows, cols, nr, nc);
      let nextBest = 0;
      for (const [nextAction] of nextNeighbors) {
        const val = q.get(qKey(nr, nc, nextAction)) ?? 0;
        if (val > nextBest) nextBest = val;
      }

      const updatedQ = currentQ + alpha * (reward + gamma * nextBest - currentQ);
      q.set(qKey(r, c, action), updatedQ);

      rewardSum += reward;
      r = nr;
      c = nc;
      episodeVisited.add(`${r},${c}`);

      if (reachedGoal) break;
    }

    if (rewardSum > bestReward) bestReward = rewardSum;
  }

  // Roll out a greedy policy after training for visualization.
  const order: [number, number][] = [[0, 0]];
  const path: [number, number][] = [[0, 0]];
  let r = 0;
  let c = 0;
  const rolloutVisited = new Set<string>(["0,0"]);

  for (let step = 0; step < rows * cols * stepMultiplier; step++) {
    if (r === goal[0] && c === goal[1]) {
      return {
        order,
        path,
        rlStats: {
          episodes,
          bestReward,
          finalEpsilon,
        },
      };
    }

    const neighbors = getNeighbors(maze, rows, cols, r, c);
    if (neighbors.length === 0) break;

    const ranked = [...neighbors].sort((a, b) => {
      const qa = q.get(qKey(r, c, a[0])) ?? Number.NEGATIVE_INFINITY;
      const qb = q.get(qKey(r, c, b[0])) ?? Number.NEGATIVE_INFINITY;
      return qb - qa;
    });

    const selected =
      ranked.find(([, nr, nc]) => !rolloutVisited.has(`${nr},${nc}`)) ?? ranked[0];

    r = selected[1];
    c = selected[2];
    rolloutVisited.add(`${r},${c}`);
    order.push([r, c]);
    path.push([r, c]);
  }

  // Fallback: if policy rollout fails, still visualize a valid route and report partial RL training.
  const fallback = astarSearch(maze, rows, cols);
  if (fallback.path.length > 0) {
    return {
      order: [...order, ...fallback.order],
      path: fallback.path,
      rlStats: {
        episodes,
        bestReward,
        finalEpsilon,
        fallbackUsed: true,
      },
    };
  }

  return {
    order,
    path: [],
    rlStats: {
      episodes,
      bestReward,
      finalEpsilon,
    },
  };
}

export default function MazeSolver({ isDark }: MazeSolverProps) {
  const [sizeKey, setSizeKey] = useState<"small" | "medium" | "large">(
    "medium",
  );
  const [algorithm, setAlgorithm] = useState<
    "bfs" | "dfs" | "astar" | "greedy" | "qlearn"
  >("astar");
  const [mazeGenerator, setMazeGenerator] = useState<MazeGenerator>("backtracking");
  const [rlPreset, setRlPreset] = useState<"quick" | "balanced" | "deep">(
    "balanced",
  );
  const [speedKey, setSpeedKey] = useState<"slow" | "medium" | "fast">(
    "medium",
  );
  const [maze, setMaze] = useState<MazeGrid>(() =>
    generateMaze(SIZES.medium.rows, SIZES.medium.cols, "backtracking"),
  );
  const [animState, setAnimState] = useState<AnimState>({
    explored: new Set(),
    path: [],
  });
  const [frames, setFrames] = useState<AnimState[]>([]);
  const [frameIndex, setFrameIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [finalMessage, setFinalMessage] = useState("Ready");
  const [status, setStatus] = useState("Ready");
  const [isAnimating, setIsAnimating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { rows, cols } = SIZES[sizeKey];

  // Canvas drawing
  const drawMaze = useCallback(
    (
      currentMaze: MazeGrid,
      state: AnimState,
      r: number,
      c: number,
    ) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const W = canvas.width;
      const H = canvas.height;
      const cellW = W / c;
      const cellH = H / r;

      // Colors based on theme
      const bg = isDark ? "#0B1525" : "#F0F4FF";
      const wallColor = isDark ? "#22304A" : "#8B9DB8";
      const exploredColor = isDark
        ? "rgba(124,58,237,0.25)"
        : "rgba(139,92,246,0.15)";
      const startColor = "#22C55E";
      const endColor = "#EF4444";
      const pathLineColor = isDark
        ? "rgba(34,211,238,0.5)"
        : "rgba(14,165,233,0.4)";

      // Clear
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Draw explored cells
      for (const key of state.explored) {
        const [cr, cc] = key.split(",").map(Number);
        ctx.fillStyle = exploredColor;
        ctx.fillRect(cc * cellW + 1, cr * cellH + 1, cellW - 2, cellH - 2);
      }

      // Draw path cells with gradient
      const pathLen = state.path.length;
      for (let i = 0; i < pathLen; i++) {
        const [pr, pc] = state.path[i];
        const t = pathLen > 1 ? i / (pathLen - 1) : 0;
        // Interpolate cyan to purple
        const r0 = 34;
        const g0 = 211;
        const b0 = 238;
        const r1 = 178;
        const g1 = 107;
        const b1 = 255;
        const ri = Math.round(r0 + t * (r1 - r0));
        const gi = Math.round(g0 + t * (g1 - g0));
        const bi = Math.round(b0 + t * (b1 - b0));
        ctx.fillStyle = `rgba(${ri},${gi},${bi},0.85)`;
        ctx.fillRect(pc * cellW + 1, pr * cellH + 1, cellW - 2, cellH - 2);
      }

      // Draw walls
      ctx.strokeStyle = wallColor;
      ctx.lineWidth = 1.5;
      for (let row = 0; row < r; row++) {
        for (let col = 0; col < c; col++) {
          const cell = currentMaze[row][col];
          const x = col * cellW;
          const y = row * cellH;
          ctx.beginPath();
          if (cell.walls.N) {
            ctx.moveTo(x, y);
            ctx.lineTo(x + cellW, y);
          }
          if (cell.walls.S) {
            ctx.moveTo(x, y + cellH);
            ctx.lineTo(x + cellW, y + cellH);
          }
          if (cell.walls.W) {
            ctx.moveTo(x, y);
            ctx.lineTo(x, y + cellH);
          }
          if (cell.walls.E) {
            ctx.moveTo(x + cellW, y);
            ctx.lineTo(x + cellW, y + cellH);
          }
          ctx.stroke();
        }
      }

      // Start badge
      ctx.fillStyle = startColor;
      ctx.beginPath();
      ctx.roundRect(2, 2, cellW - 4, cellH - 4, 3);
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = `bold ${Math.min(cellW, cellH) * 0.45}px sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("S", cellW / 2, cellH / 2);

      // End badge
      const ex = (c - 1) * cellW;
      const ey = (r - 1) * cellH;
      ctx.fillStyle = endColor;
      ctx.beginPath();
      ctx.roundRect(ex + 2, ey + 2, cellW - 4, cellH - 4, 3);
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.fillText("E", ex + cellW / 2, ey + cellH / 2);

      // Path glow overlay
      if (state.path.length > 1) {
        ctx.strokeStyle = pathLineColor;
        ctx.lineWidth = Math.max(2, cellW * 0.25);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        const [sr, sc] = state.path[0];
        ctx.moveTo(sc * cellW + cellW / 2, sr * cellH + cellH / 2);
        for (let i = 1; i < pathLen; i++) {
          const [pr, pc] = state.path[i];
          ctx.lineTo(pc * cellW + cellW / 2, pr * cellH + cellH / 2);
        }
        ctx.stroke();
      }

      // Outer border
      ctx.strokeStyle = isDark ? "#334155" : "#CBD5E8";
      ctx.lineWidth = 2;
      ctx.strokeRect(0, 0, W, H);
    },
    [isDark],
  );

  // Redraw on state changes
  useEffect(() => {
    drawMaze(maze, animState, rows, cols);
  }, [maze, animState, rows, cols, drawMaze]);

  const stopPlayback = useCallback(() => {
    if (animRef.current) {
      clearTimeout(animRef.current);
      animRef.current = null;
    }
    setIsPlaying(false);
    setIsAnimating(false);
  }, []);

  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;
    if (frameIndex >= frames.length - 1) {
      stopPlayback();
      setStatus(finalMessage);
      return;
    }

    animRef.current = setTimeout(() => {
      setFrameIndex((idx) => {
        const next = Math.min(frames.length - 1, idx + 1);
        setAnimState(frames[next]);
        return next;
      });
    }, SPEEDS[speedKey]);

    return () => {
      if (animRef.current) clearTimeout(animRef.current);
    };
  }, [isPlaying, frameIndex, frames, speedKey, stopPlayback, finalMessage]);

  const buildFrames = useCallback((order: [number, number][], path: [number, number][]) => {
    const built: AnimState[] = [];
    const explored = new Set<string>();
    built.push({ explored: new Set(), path: [] });

    for (const [r, c] of order) {
      explored.add(`${r},${c}`);
      built.push({ explored: new Set(explored), path: [] });
    }

    built.push({ explored: new Set(explored), path: path.length > 0 ? [...path] : [] });
    return built;
  }, []);

  const newMaze = () => {
    stopPlayback();
    const m = generateMaze(rows, cols, mazeGenerator);
    setMaze(m);
    setFrames([]);
    setFrameIndex(0);
    setAnimState({ explored: new Set(), path: [] });
    setFinalMessage("Ready");
    setStatus("Ready");
  };

  const resetAnim = () => {
    stopPlayback();
    setFrames([]);
    setFrameIndex(0);
    setAnimState({ explored: new Set(), path: [] });
    setFinalMessage("Ready");
    setStatus("Ready");
  };

  const runSearch = () => {
    stopPlayback();
    const startedAt = performance.now();

    const area = rows * cols;
    const baseEpisodes = RL_PRESETS[rlPreset];
    const tunedEpisodes =
      area >= 400
        ? Math.min(baseEpisodes, rlPreset === "deep" ? 240 : 180)
        : area >= 225
          ? Math.min(baseEpisodes, rlPreset === "deep" ? 420 : 300)
          : baseEpisodes;
    const tunedStepMultiplier = area >= 400 ? 2 : area >= 225 ? 3 : 4;
    const qlearningWasCapped = tunedEpisodes !== baseEpisodes;

    const searchResult =
      algorithm === "bfs"
        ? bfsSearch(maze, rows, cols)
        : algorithm === "dfs"
          ? dfsSearch(maze, rows, cols)
          : algorithm === "astar"
            ? astarSearch(maze, rows, cols)
            : algorithm === "greedy"
              ? greedySearch(maze, rows, cols)
                : qLearningSearch(maze, rows, cols, tunedEpisodes, tunedStepMultiplier);

    const { order, path } = searchResult;
    if (order.length === 0) {
      setStatus("No path found");
      return;
    }

    const generatedFrames = buildFrames(order, path);
    setFrames(generatedFrames);
    setFrameIndex(0);
    setAnimState(generatedFrames[0]);
    setIsAnimating(true);
    setIsPlaying(true);
    setStatus("Animating...");

    if (path.length > 0) {
      if (searchResult.rlStats) {
        setFinalMessage(
          searchResult.rlStats.fallbackUsed
            ? `RL policy was unstable; fallback path shown · ${path.length - 1} steps`
            : `${
                qlearningWasCapped ? "RL (capped for large maze)" : "RL"
              } learned path in ${searchResult.rlStats.episodes} episodes · ${path.length - 1} steps`,
        );
      } else {
        setFinalMessage(
          `Path found! ${path.length - 1} steps · ${order.length} explored`,
        );
      }
    } else if (searchResult.rlStats) {
      setFinalMessage(
        `RL training incomplete (${searchResult.rlStats.episodes} episodes). Try Deep preset.`,
      );
    } else {
      setFinalMessage("No path found");
    }

    const duration = Math.max(1, Math.round(performance.now() - startedAt));
    const algorithmLabel =
      algorithm === "astar"
        ? "A*"
        : algorithm === "qlearn"
          ? "Q-Learning"
          : algorithm === "greedy"
            ? "Greedy"
            : algorithm.toUpperCase();

    addStat({
      id: `maze-${Date.now()}`,
      algorithm: algorithmLabel,
      problem: `Maze ${rows}x${cols} (${mazeGenerator})`,
      timestamp: Date.now(),
      duration,
      stepsCount: path.length > 0 ? Math.max(0, path.length - 1) : order.length,
      nodesExplored: order.length,
      success: path.length > 0,
      difficulty: sizeKey,
    });
  };

  const togglePlayPause = () => {
    if (frames.length === 0) return;
    if (frameIndex >= frames.length - 1) {
      setFrameIndex(0);
      setAnimState(frames[0]);
    }
    setIsPlaying((v) => !v);
    setIsAnimating(true);
  };

  const rewindStep = () => {
    if (frames.length === 0) return;
    stopPlayback();
    setFrameIndex((idx) => {
      const next = Math.max(0, idx - 1);
      setAnimState(frames[next]);
      return next;
    });
  };

  const fastForward = () => {
    if (frames.length === 0) return;
    stopPlayback();
    setFrameIndex((idx) => {
      const next = Math.min(frames.length - 1, idx + 5);
      setAnimState(frames[next]);
      if (next === frames.length - 1) setStatus(finalMessage);
      return next;
    });
  };

  // Handle size change
  const handleSizeChange = (key: "small" | "medium" | "large") => {
    stopPlayback();
    setSizeKey(key);
    const { rows: nr, cols: nc } = SIZES[key];
    const m = generateMaze(nr, nc, mazeGenerator);
    setMaze(m);
    setFrames([]);
    setFrameIndex(0);
    setAnimState({ explored: new Set(), path: [] });
    setFinalMessage("Ready");
    setStatus("Ready");
  };

  const handleGeneratorChange = (generator: MazeGenerator) => {
    stopPlayback();
    setMazeGenerator(generator);
    const m = generateMaze(rows, cols, generator);
    setMaze(m);
    setFrames([]);
    setFrameIndex(0);
    setAnimState({ explored: new Set(), path: [] });
    setFinalMessage("Ready");
    setStatus("Ready");
  };

  const statusColor =
    status.includes("found!") || status.includes("found")
      ? "text-emerald-400"
      : status === "No path found"
        ? "text-red-400"
        : status === "Searching..." || status === "Animating..."
          ? "text-cyan-400 animate-pulse"
          : "text-muted-foreground";

  const exploredCount = animState.explored.size;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="rounded-2xl border border-border bg-card card-glow p-6 flex flex-col gap-5"
      data-ocid="maze.card"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl tracking-wide">
            MAZE SOLVER
          </h2>
          <p className={`text-sm mt-0.5 ${statusColor}`}>{status}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-cyan-700 flex items-center justify-center neon-glow">
          <span className="text-white text-lg">🌐</span>
        </div>
      </div>

      {/* Size + Algorithm selectors */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            Size:
          </span>
          {(["small", "medium", "large"] as const).map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => handleSizeChange(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${
                sizeKey === s
                  ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-400"
                  : "border-border hover:border-cyan-500/30 hover:bg-cyan-500/5"
              }`}
              data-ocid="maze.tab"
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            Algo:
          </span>
          {(["bfs", "dfs", "astar", "greedy", "qlearn"] as const).map((a) => (
            <button
              type="button"
              key={a}
              onClick={() => setAlgorithm(a)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                algorithm === a
                  ? "border-purple-500/60 bg-purple-500/15 text-purple-400"
                  : "border-border hover:border-purple-500/30 hover:bg-purple-500/5"
              }`}
              data-ocid="maze.tab"
            >
              {a === "astar"
                ? "A*"
                : a === "qlearn"
                  ? "Q-Learn"
                  : a === "greedy"
                      ? "Greedy"
                      : a.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">
            Maze:
          </span>
          {([
            ["backtracking", "DFS Carve"],
            ["prim", "Prim"],
          ] as const).map(([value, label]) => (
            <button
              type="button"
              key={value}
              onClick={() => handleGeneratorChange(value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                mazeGenerator === value
                  ? "border-fuchsia-500/60 bg-fuchsia-500/15 text-fuchsia-400"
                  : "border-border hover:border-fuchsia-500/30 hover:bg-fuchsia-500/5"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {algorithm === "qlearn" && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">
            Training:
          </span>
          {(["quick", "balanced", "deep"] as const).map((preset) => (
            <button
              type="button"
              key={preset}
              onClick={() => setRlPreset(preset)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${
                rlPreset === preset
                  ? "border-emerald-500/60 bg-emerald-500/15 text-emerald-400"
                  : "border-border hover:border-emerald-500/30 hover:bg-emerald-500/5"
              }`}
            >
              {preset} ({RL_PRESETS[preset]} ep)
            </button>
          ))}
          <span className="text-[11px] text-muted-foreground/80 ml-1">
            Large mazes auto-cap RL episodes for responsiveness.
          </span>
        </div>
      )}

      {/* Canvas */}
      <div className="relative rounded-xl overflow-hidden border border-border">
        <canvas
          ref={canvasRef}
          width={420}
          height={420}
          className="w-full block maze-pixel-canvas"
          data-ocid="maze.canvas_target"
        />
        {isAnimating && (
          <div
            className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 text-cyan-400 text-xs"
            data-ocid="maze.loading_state"
          >
            <Loader2 size={11} className="animate-spin" />
            {exploredCount} explored · step {frames.length > 0 ? frameIndex : 0}
          </div>
        )}
      </div>

      {/* Speed slider */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground font-medium whitespace-nowrap">
          Speed:
        </span>
        <div className="flex items-center gap-2 flex-1">
          {(["slow", "medium", "fast"] as const).map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setSpeedKey(s)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                speedKey === s
                  ? "border-cyan-500/60 bg-cyan-500/15 text-cyan-400"
                  : "border-border hover:bg-accent text-muted-foreground"
              }`}
              data-ocid="maze.toggle"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={resetAnim}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-border hover:bg-accent transition-all disabled:opacity-40"
          data-ocid="maze.secondary_button"
        >
          <RotateCcw size={14} />
          Reset
        </button>
        <button
          type="button"
          onClick={newMaze}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-border hover:bg-accent transition-all disabled:opacity-40"
          data-ocid="maze.secondary_button"
        >
          <Shuffle size={14} />
          New Maze
        </button>
        <button
          type="button"
          onClick={runSearch}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-900 hover:opacity-90 transition-all disabled:opacity-50 shadow-neon"
          data-ocid="maze.primary_button"
        >
          <Play size={14} />
          {algorithm === "qlearn" ? "Train + Run Policy" : "Run Algorithm"}
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={rewindStep}
          disabled={frames.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-border hover:bg-accent transition-all disabled:opacity-40"
        >
          <SkipBack size={14} />
          Rewind
        </button>
        <button
          type="button"
          onClick={togglePlayPause}
          disabled={frames.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-border hover:bg-accent transition-all disabled:opacity-40"
        >
          {isPlaying ? <Pause size={14} /> : <Play size={14} />}
          {isPlaying ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={fastForward}
          disabled={frames.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-border hover:bg-accent transition-all disabled:opacity-40"
        >
          <SkipForward size={14} />
          Fast-forward
        </button>
      </div>

      {/* Info panel */}
      <div className="grid grid-cols-3 gap-3">
        {[
          {
            label: "Algorithm",
            value:
              algorithm === "astar"
                ? "A*"
                : algorithm === "qlearn"
                  ? "Q-Learning"
                  : algorithm === "dfs"
                    ? "DFS"
                    : algorithm === "greedy"
                      ? "Greedy"
                      : "BFS",
          },
          {
            label: "Grid",
            value: `${rows}×${cols}`,
          },
          {
            label: "Path Steps",
            value:
              animState.path.length > 0
                ? String(animState.path.length - 1)
                : "—",
          },
          {
            label: "Playback",
            value: frames.length > 0 ? `${frameIndex}/${frames.length - 1}` : "—",
          },
        ].map((info) => (
          <div
            key={info.label}
            className="p-3 rounded-xl border border-border bg-muted/30 text-center"
          >
            <div className="text-xs text-muted-foreground mb-1">
              {info.label}
            </div>
            <div className="font-display font-bold text-sm gradient-text">
              {info.value}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-500" />S - Start
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-500" />E - End
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-purple-500/40" />
          Explored
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-cyan-500/80" />
          Path
        </span>
      </div>
    </motion.div>
  );
}
