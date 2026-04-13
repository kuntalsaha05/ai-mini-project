import { Play, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { useRef, useState } from "react";
import { playSound } from "../utils/soundEffects";

interface AlgorithmState {
  explored: Set<string>;
  path: [number, number][];
  current: [number, number] | null;
  steps: number;
}

type Cell = {
  visited: boolean;
  walls: { N: boolean; S: boolean; E: boolean; W: boolean };
};

type MazeGrid = Cell[][];

const SIZES: Record<string, { rows: number; cols: number }> = {
  small: { rows: 10, cols: 10 },
  medium: { rows: 15, cols: 15 },
  large: { rows: 20, cols: 20 },
};

function generateMaze(rows: number, cols: number): MazeGrid {
  const grid = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      visited: false,
      walls: { N: true, S: true, E: true, W: true },
    }))
  );

  const carve = (r: number, c: number) => {
    grid[r][c].visited = true;
    const dirs: ["N" | "S" | "E" | "W", number, number][] = [
      ["N", -1, 0],
      ["S", 1, 0],
      ["E", 0, 1],
      ["W", 0, -1],
    ];

    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }

    for (const [dir, dr, dc] of dirs) {
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !grid[nr][nc].visited) {
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
  };

  carve(0, 0);
  return grid;
}

export default function MazeComparison({ isDark }: { isDark: boolean }) {
  const [size, setSize] = useState<"small" | "medium" | "large">("medium");
  const [bfsState, setBfsState] = useState<AlgorithmState>({
    explored: new Set(),
    path: [],
    current: null,
    steps: 0,
  });
  const [astarState, setAstarState] = useState<AlgorithmState>({
    explored: new Set(),
    path: [],
    current: null,
    steps: 0,
  });
  const [solving, setSolving] = useState(false);
  const [maze, setMaze] = useState(generateMaze(SIZES[size].rows, SIZES[size].cols));

  const handleSolve = async () => {
    setSolving(true);

    const currentMaze = generateMaze(SIZES[size].rows, SIZES[size].cols);
    setMaze(currentMaze);
    setBfsState({ explored: new Set(), path: [], current: null, steps: 0 });
    setAstarState({ explored: new Set(), path: [], current: null, steps: 0 });

    const rows = SIZES[size].rows;
    const cols = SIZES[size].cols;

    await Promise.all([
      runBFS(currentMaze, rows, cols),
      runAStar(currentMaze, rows, cols)
    ]);

    setSolving(false);
    playSound("solved");
  };

  const runBFS = async (currentMaze: MazeGrid, rows: number, cols: number) => {
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
      setBfsState((s) => ({
        ...s,
        explored: new Set(visited),
        current: [r, c],
        steps: order.length,
      }));
      playSound("stepComplete");
      await new Promise((r) => setTimeout(r, 30));

      if (r === goal[0] && c === goal[1]) break;

      const cell = currentMaze[r][c];
      const neighbors: ["N" | "S" | "E" | "W", number, number][] = [
        ["N", r - 1, c],
        ["S", r + 1, c],
        ["E", r, c + 1],
        ["W", r, c - 1],
      ];

      for (const [dir, nr, nc] of neighbors) {
        const key = `${nr},${nc}`;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !cell.walls[dir] && !visited.has(key)) {
          visited.add(key);
          parent.set(key, [r, c]);
          queue.push([nr, nc]);
        }
      }
    }

    const path: [number, number][] = [];
    let cur: [number, number] | null | undefined = goal;
    while (cur != null) {
      path.unshift(cur);
      cur = parent.get(`${cur[0]},${cur[1]}`);
    }

    setBfsState((s) => ({
      ...s,
      path: path.length > 1 ? path : [],
      explored: visited,
      steps: order.length,
    }));
  };

  const runAStar = async (currentMaze: MazeGrid, rows: number, cols: number) => {
    const goal: [number, number] = [rows - 1, cols - 1];
    const heuristic = (r: number, c: number) => Math.abs(r - goal[0]) + Math.abs(c - goal[1]);

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
      const current = openSet.shift()!;
      const key = `${current.r},${current.c}`;

      if (closed.has(key)) continue;
      closed.add(key);
      order.push([current.r, current.c]);

      setAstarState((s) => ({
        ...s,
        explored: new Set(closed),
        current: [current.r, current.c],
        steps: order.length,
      }));
      playSound("stepComplete");
      await new Promise((r) => setTimeout(r, 30));

      if (current.r === goal[0] && current.c === goal[1]) break;

      const cell = currentMaze[current.r][current.c];
      const neighbors: ["N" | "S" | "E" | "W", number, number][] = [
        ["N", current.r - 1, current.c],
        ["S", current.r + 1, current.c],
        ["E", current.r, current.c + 1],
        ["W", current.r, current.c - 1],
      ];

      for (const [dir, nr, nc] of neighbors) {
        const key = `${nr},${nc}`;
        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !cell.walls[dir] && !closed.has(key)) {
          const tentativeG = (gScore.get(`${current.r},${current.c}`) || 0) + 1;
          const current_g = gScore.get(key) || Infinity;

          if (tentativeG < current_g) {
            parent.set(key, [current.r, current.c]);
            gScore.set(key, tentativeG);
            const f = tentativeG + heuristic(nr, nc);
            openSet.push({ f, r: nr, c: nc });
          }
        }
      }
    }

    const path: [number, number][] = [];
    let cur: [number, number] | null | undefined = goal;
    while (cur != null) {
      path.unshift(cur);
      cur = parent.get(`${cur[0]},${cur[1]}`);
    }

    setAstarState((s) => ({
      ...s,
      path: path.length > 1 ? path : [],
      explored: closed,
      steps: order.length,
    }));
  };

  const handleReset = () => {
    setBfsState({ explored: new Set(), path: [], current: null, steps: 0 });
    setAstarState({ explored: new Set(), path: [], current: null, steps: 0 });
    const newMaze = generateMaze(SIZES[size].rows, SIZES[size].cols);
    setMaze(newMaze);
  };

  const CELL_SIZE = size === "small" ? 12 : size === "medium" ? 10 : 8;

  return (
    <div className="p-6 rounded-2xl border border-border bg-card">
      <h2 className="font-display font-bold text-2xl mb-4">🔄 Algorithm Comparison (BFS vs A*)</h2>

      <div className="mb-6 flex gap-4 flex-wrap">
        <div>
          <label className="text-sm font-medium mb-2 block">Maze Size</label>
          <select value={size} onChange={(e) => { setSize(e.target.value as "small" | "medium" | "large"); handleReset(); }} disabled={solving} className="px-3 py-2 rounded-lg border border-border bg-background">
            <option value="small">Small (10x10)</option>
            <option value="medium">Medium (15x15)</option>
            <option value="large">Large (20x20)</option>
          </select>
        </div>

        <div className="flex gap-2 items-end">
          <button onClick={handleSolve} disabled={solving} className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-500 text-slate-900 font-semibold flex items-center gap-2 hover:opacity-90 disabled:opacity-50">
            <Play size={16} /> Compare
          </button>
          <button onClick={handleReset} className="px-4 py-2 rounded-lg border border-border hover:bg-accent flex items-center gap-2">
            <RotateCcw size={16} /> Reset
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-semibold mb-3 text-cyan-400">BFS</h3>
          <div className="p-3 rounded-lg bg-muted text-sm">
            <p>Steps: <span className="font-bold">{bfsState.steps}</span></p>
            <p>Path Length: <span className="font-bold">{bfsState.path.length}</span></p>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-3 text-purple-400">A*</h3>
          <div className="p-3 rounded-lg bg-muted text-sm">
            <p>Steps: <span className="font-bold">{astarState.steps}</span></p>
            <p>Path Length: <span className="font-bold">{astarState.path.length}</span></p>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm">
        <p className="font-semibold mb-2">💡 Key Differences</p>
        <ul className="text-xs space-y-1 text-muted-foreground">
          <li>• BFS: Explores all neighbors level-by-level (MORE cells explored)</li>
          <li>• A*: Uses heuristic to prioritize promising paths (FEWER cells explored)</li>
          <li>• A* usually faster with lower step count</li>
          <li>• Both find shortest path in unweighted mazes</li>
        </ul>
      </div>
    </div>
  );
}
