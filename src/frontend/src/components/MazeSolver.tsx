import { Loader2, Play, RotateCcw, Shuffle } from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

type Cell = {
  visited: boolean;
  walls: { N: boolean; S: boolean; E: boolean; W: boolean };
};

type MazeGrid = Cell[][];

type AnimState = {
  explored: Set<string>;
  path: [number, number][];
};

interface MazeSolverProps {
  isDark: boolean;
}

const SIZES: Record<string, { rows: number; cols: number }> = {
  small: { rows: 10, cols: 10 },
  medium: { rows: 15, cols: 15 },
  large: { rows: 20, cols: 20 },
};

const SPEEDS = { slow: 80, medium: 30, fast: 8 };

function initGrid(rows: number, cols: number): MazeGrid {
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({
      visited: false,
      walls: { N: true, S: true, E: true, W: true },
    })),
  );
}

function generateMaze(rows: number, cols: number): MazeGrid {
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

function bfsSearch(
  maze: MazeGrid,
  rows: number,
  cols: number,
): { order: [number, number][]; path: [number, number][] } {
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

  // Backtrack path
  const path: [number, number][] = [];
  let cur: [number, number] | null | undefined = goal;
  while (cur != null) {
    path.unshift(cur);
    cur = parent.get(`${cur[0]},${cur[1]}`);
  }

  return { order, path: path.length > 1 ? path : [] };
}

function astarSearch(
  maze: MazeGrid,
  rows: number,
  cols: number,
): { order: [number, number][]; path: [number, number][] } {
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

  const path: [number, number][] = [];
  let cur: [number, number] | null | undefined = goal;
  while (cur != null) {
    path.unshift(cur);
    cur = parent.get(`${cur[0]},${cur[1]}`);
  }

  return { order, path: path.length > 1 ? path : [] };
}

export default function MazeSolver({ isDark }: MazeSolverProps) {
  const [sizeKey, setSizeKey] = useState<"small" | "medium" | "large">(
    "medium",
  );
  const [algorithm, setAlgorithm] = useState<"bfs" | "astar">("astar");
  const [speedKey, setSpeedKey] = useState<"slow" | "medium" | "fast">(
    "medium",
  );
  const [maze, setMaze] = useState<MazeGrid>(() =>
    generateMaze(SIZES.medium.rows, SIZES.medium.cols),
  );
  const [animState, setAnimState] = useState<AnimState>({
    explored: new Set(),
    path: [],
  });
  const [status, setStatus] = useState("Ready");
  const [isAnimating, setIsAnimating] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { rows, cols } = SIZES[sizeKey];

  // Canvas drawing
  const drawMaze = useCallback(
    (currentMaze: MazeGrid, state: AnimState, r: number, c: number) => {
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

  const newMaze = () => {
    if (animRef.current) clearTimeout(animRef.current);
    setIsAnimating(false);
    const m = generateMaze(rows, cols);
    setMaze(m);
    setAnimState({ explored: new Set(), path: [] });
    setStatus("Ready");
  };

  const resetAnim = () => {
    if (animRef.current) clearTimeout(animRef.current);
    setIsAnimating(false);
    setAnimState({ explored: new Set(), path: [] });
    setStatus("Ready");
  };

  const animatePath = () => {
    if (isAnimating) return;
    resetAnim();

    const searchResult =
      algorithm === "bfs"
        ? bfsSearch(maze, rows, cols)
        : astarSearch(maze, rows, cols);

    const { order, path } = searchResult;

    if (order.length === 0) {
      setStatus("No path found");
      return;
    }

    setIsAnimating(true);
    setStatus("Searching...");

    const speed = SPEEDS[speedKey];
    const explored = new Set<string>();
    let step = 0;

    function tick() {
      if (step < order.length) {
        explored.add(`${order[step][0]},${order[step][1]}`);
        step++;
        setAnimState({ explored: new Set(explored), path: [] });
        animRef.current = setTimeout(tick, speed);
      } else {
        // Done exploring, draw path
        if (path.length > 0) {
          setAnimState({ explored: new Set(explored), path });
          setStatus(
            `Path found! ${path.length - 1} steps · ${order.length} explored`,
          );
        } else {
          setStatus("No path found");
        }
        setIsAnimating(false);
      }
    }

    tick();
  };

  // Handle size change
  const handleSizeChange = (key: "small" | "medium" | "large") => {
    if (animRef.current) clearTimeout(animRef.current);
    setIsAnimating(false);
    setSizeKey(key);
    const { rows: nr, cols: nc } = SIZES[key];
    const m = generateMaze(nr, nc);
    setMaze(m);
    setAnimState({ explored: new Set(), path: [] });
    setStatus("Ready");
  };

  const statusColor =
    status.includes("found!") || status.includes("found")
      ? "text-emerald-400"
      : status === "No path found"
        ? "text-red-400"
        : status === "Searching..."
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
          {(["bfs", "astar"] as const).map((a) => (
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
              {a === "astar" ? "A*" : "BFS"}
            </button>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div className="relative rounded-xl overflow-hidden border border-border">
        <canvas
          ref={canvasRef}
          width={420}
          height={420}
          className="w-full block"
          style={{ imageRendering: "pixelated" }}
          data-ocid="maze.canvas_target"
        />
        {isAnimating && (
          <div
            className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-black/60 text-cyan-400 text-xs"
            data-ocid="maze.loading_state"
          >
            <Loader2 size={11} className="animate-spin" />
            {exploredCount} explored
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
          disabled={isAnimating}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-border hover:bg-accent transition-all disabled:opacity-40"
          data-ocid="maze.secondary_button"
        >
          <RotateCcw size={14} />
          Reset
        </button>
        <button
          type="button"
          onClick={newMaze}
          disabled={isAnimating}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-border hover:bg-accent transition-all disabled:opacity-40"
          data-ocid="maze.secondary_button"
        >
          <Shuffle size={14} />
          New Maze
        </button>
        <button
          type="button"
          onClick={animatePath}
          disabled={isAnimating}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-cyan-500 to-cyan-600 text-slate-900 hover:opacity-90 transition-all disabled:opacity-50 shadow-neon"
          data-ocid="maze.primary_button"
        >
          {isAnimating ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Animating...
            </>
          ) : (
            <>
              <Play size={14} />
              Animate Path
            </>
          )}
        </button>
      </div>

      {/* Info panel */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Algorithm", value: algorithm === "astar" ? "A*" : "BFS" },
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
