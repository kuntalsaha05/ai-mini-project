import {
  Copy,
  Lightbulb,
  ImageIcon,
  Loader2,
  Play,
  Save,
  FolderOpen,
  RotateCcw,
  Square,
  Upload,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { addStat } from "../utils/statistics";

type Grid = number[][];
type CellState =
  | "given"
  | "user"
  | "mistake"
  | "solved"
  | "empty"
  | "trying"
  | "backtracking";
type Step = {
  row: number;
  col: number;
  value: number;
  type: "try" | "place" | "backtrack";
};
type Speed = "slow" | "normal" | "fast";
type SolveAlgorithm = "backtracking" | "constraint";

const SPEED_MS: Record<Speed, number> = { slow: 50, normal: 18, fast: 5 };

// Preset puzzles
const PRESETS: Record<string, Grid> = {
  easy: [
    [5, 3, 0, 0, 7, 0, 0, 0, 0],
    [6, 0, 0, 1, 9, 5, 0, 0, 0],
    [0, 9, 8, 0, 0, 0, 0, 6, 0],
    [8, 0, 0, 0, 6, 0, 0, 0, 3],
    [4, 0, 0, 8, 0, 3, 0, 0, 1],
    [7, 0, 0, 0, 2, 0, 0, 0, 6],
    [0, 6, 0, 0, 0, 0, 2, 8, 0],
    [0, 0, 0, 4, 1, 9, 0, 0, 5],
    [0, 0, 0, 0, 8, 0, 0, 7, 9],
  ],
  medium: [
    [0, 0, 0, 2, 6, 0, 7, 0, 1],
    [6, 8, 0, 0, 7, 0, 0, 9, 0],
    [1, 9, 0, 0, 0, 4, 5, 0, 0],
    [8, 2, 0, 1, 0, 0, 0, 4, 0],
    [0, 0, 4, 6, 0, 2, 9, 0, 0],
    [0, 5, 0, 0, 0, 3, 0, 2, 8],
    [0, 0, 9, 3, 0, 0, 0, 7, 4],
    [0, 4, 0, 0, 5, 0, 0, 3, 6],
    [7, 0, 3, 0, 1, 8, 0, 0, 0],
  ],
  hard: [
    [0, 0, 0, 6, 0, 0, 4, 0, 0],
    [7, 0, 0, 0, 0, 3, 6, 0, 0],
    [0, 0, 0, 0, 9, 1, 0, 8, 0],
    [0, 0, 0, 0, 0, 0, 0, 0, 0],
    [0, 5, 0, 1, 8, 0, 0, 0, 3],
    [0, 0, 0, 3, 0, 6, 0, 4, 5],
    [0, 4, 0, 2, 0, 0, 0, 6, 0],
    [9, 0, 3, 0, 0, 0, 0, 0, 0],
    [0, 2, 0, 0, 0, 0, 1, 0, 0],
  ],
};

function deepCopy(grid: Grid): Grid {
  return grid.map((row) => [...row]);
}

function emptyGrid(): Grid {
  return Array(9)
    .fill(null)
    .map(() => Array(9).fill(0));
}

function emptyBool(): boolean[][] {
  return Array(9)
    .fill(null)
    .map(() => Array(9).fill(false));
}

function isValid(grid: Grid, row: number, col: number, num: number): boolean {
  for (let c = 0; c < 9; c++) {
    if (c !== col && grid[row][c] === num) return false;
  }
  for (let r = 0; r < 9; r++) {
    if (r !== row && grid[r][col] === num) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = boxRow; r < boxRow + 3; r++) {
    for (let c = boxCol; c < boxCol + 3; c++) {
      if (r !== row && c !== col && grid[r][c] === num) return false;
    }
  }
  return true;
}

function collectSolveSteps(initialGrid: Grid): {
  steps: Step[];
  solution: Grid | null;
} {
  const steps: Step[] = [];
  const grid = deepCopy(initialGrid);

  function bt(): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          for (let num = 1; num <= 9; num++) {
            if (isValid(grid, row, col, num)) {
              grid[row][col] = num;
              steps.push({ row, col, value: num, type: "try" });
              if (bt()) {
                steps.push({ row, col, value: num, type: "place" });
                return true;
              }
              grid[row][col] = 0;
              steps.push({ row, col, value: 0, type: "backtrack" });
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  const solved = bt();
  return { steps, solution: solved ? deepCopy(grid) : null };
}

function collectConstraintSteps(initialGrid: Grid): {
  steps: Step[];
  solution: Grid | null;
} {
  const grid = deepCopy(initialGrid);
  const steps: Step[] = [];

  function candidates(r: number, c: number): number[] {
    const list: number[] = [];
    for (let n = 1; n <= 9; n++) {
      if (isValid(grid, r, c, n)) list.push(n);
    }
    return list;
  }

  function propagateSingles(): boolean {
    let changed = true;
    while (changed) {
      changed = false;
      for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
          if (grid[r][c] !== 0) continue;
          const cand = candidates(r, c);
          if (cand.length === 0) return false;
          if (cand.length === 1) {
            grid[r][c] = cand[0];
            steps.push({ row: r, col: c, value: cand[0], type: "place" });
            changed = true;
          }
        }
      }
    }
    return true;
  }

  function solve(): boolean {
    if (!propagateSingles()) return false;

    let target: [number, number] | null = null;
    let bestCand: number[] = [];

    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (grid[r][c] !== 0) continue;
        const cand = candidates(r, c);
        if (cand.length === 0) return false;
        if (!target || cand.length < bestCand.length) {
          target = [r, c];
          bestCand = cand;
        }
      }
    }

    if (!target) return true;

    const [tr, tc] = target;
    for (const n of bestCand) {
      if (!isValid(grid, tr, tc, n)) continue;
      grid[tr][tc] = n;
      steps.push({ row: tr, col: tc, value: n, type: "try" });
      if (solve()) {
        steps.push({ row: tr, col: tc, value: n, type: "place" });
        return true;
      }
      grid[tr][tc] = 0;
      steps.push({ row: tr, col: tc, value: 0, type: "backtrack" });
    }

    return false;
  }

  const solved = solve();
  return { steps, solution: solved ? deepCopy(grid) : null };
}

function formatElapsed(seconds: number): string {
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

function isSolvedGrid(grid: Grid): boolean {
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 9; c++) {
      const value = grid[r][c];
      if (value < 1 || value > 9) return false;
      if (!isValid(grid, r, c, value)) return false;
    }
  }
  return true;
}

function generateSolvedGrid(): Grid {
  const grid = emptyGrid();

  function fillCell(index: number): boolean {
    if (index === 81) return true;
    const r = Math.floor(index / 9);
    const c = index % 9;

    const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = nums.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [nums[i], nums[j]] = [nums[j], nums[i]];
    }

    for (const n of nums) {
      if (!isValid(grid, r, c, n)) continue;
      grid[r][c] = n;
      if (fillCell(index + 1)) return true;
      grid[r][c] = 0;
    }

    return false;
  }

  fillCell(0);
  return grid;
}

function generatePuzzle(level: "easy" | "medium" | "hard"): Grid {
  const solved = generateSolvedGrid();
  const puzzle = deepCopy(solved);
  const removeCount = level === "easy" ? 36 : level === "medium" ? 45 : 54;

  let removed = 0;
  while (removed < removeCount) {
    const r = Math.floor(Math.random() * 9);
    const c = Math.floor(Math.random() * 9);
    if (puzzle[r][c] === 0) continue;
    puzzle[r][c] = 0;
    removed++;
  }

  return puzzle;
}

// Image-based OCR using canvas pixel analysis
async function extractGridFromImage(file: File): Promise<Grid> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const source = document.createElement("canvas");
      source.width = img.naturalWidth || img.width;
      source.height = img.naturalHeight || img.height;
      const sourceCtx = source.getContext("2d")!;
      sourceCtx.drawImage(img, 0, 0, source.width, source.height);

      const srcImage = sourceCtx.getImageData(0, 0, source.width, source.height);
      const srcData = srcImage.data;
      const rowInk = Array(source.height).fill(0);
      const colInk = Array(source.width).fill(0);

      for (let y = 0; y < source.height; y++) {
        for (let x = 0; x < source.width; x++) {
          const i = (y * source.width + x) * 4;
          const gray = 0.299 * srcData[i] + 0.587 * srcData[i + 1] + 0.114 * srcData[i + 2];
          if (gray < 120) {
            rowInk[y]++;
            colInk[x]++;
          }
        }
      }

      const rowThreshold = source.width * 0.45;
      const colThreshold = source.height * 0.45;
      let top = rowInk.findIndex((v) => v > rowThreshold);
      let bottom = source.height - 1 - [...rowInk].reverse().findIndex((v) => v > rowThreshold);
      let left = colInk.findIndex((v) => v > colThreshold);
      let right = source.width - 1 - [...colInk].reverse().findIndex((v) => v > colThreshold);

      // Fallback to a centered crop if line detection fails.
      if (top < 0 || left < 0 || bottom <= top || right <= left) {
        const side = Math.min(source.width, source.height) * 0.86;
        left = Math.floor((source.width - side) / 2);
        top = Math.floor((source.height - side) / 2);
        right = Math.floor(left + side);
        bottom = Math.floor(top + side);
      }

      const cropW = right - left;
      const cropH = bottom - top;
      const side = Math.max(180, Math.min(cropW, cropH));
      const cx = Math.floor((left + right) / 2);
      const cy = Math.floor((top + bottom) / 2);
      const cropX = Math.max(0, Math.min(source.width - side, cx - Math.floor(side / 2)));
      const cropY = Math.max(0, Math.min(source.height - side, cy - Math.floor(side / 2)));

      const size = 450;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(source, cropX, cropY, side, side, 0, 0, size, size);

      const imageData = ctx.getImageData(0, 0, size, size);
      const d = imageData.data;
      for (let i = 0; i < d.length; i += 4) {
        const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
        const val = gray < 145 ? 0 : 255;
        d[i] = d[i + 1] = d[i + 2] = val;
        d[i + 3] = 255;
      }
      ctx.putImageData(imageData, 0, 0);

      const cellSize = size / 9;
      const grid: Grid = Array(9)
        .fill(null)
        .map(() => Array(9).fill(0));

      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          // Avoid reading grid lines by trimming inner margins.
          const x = Math.floor(col * cellSize + cellSize * 0.16);
          const y = Math.floor(row * cellSize + cellSize * 0.16);
          const w = Math.floor(cellSize * 0.68);
          const h = Math.floor(cellSize * 0.68);
          if (w < 4 || h < 4) continue;
          const cellData = ctx.getImageData(x, y, w, h);
          grid[row][col] = analyzeCell(cellData, w, h);
        }
      }
      resolve(grid);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(deepCopy(PRESETS.easy));
    };
    img.src = url;
  });
}

function analyzeCell(imageData: ImageData, w: number, h: number): number {
  const d = imageData.data;
  const binary: boolean[] = [];
  for (let i = 0; i < d.length; i += 4) binary.push(d[i] < 128);
  const darkCount = binary.filter(Boolean).length;
  const density = darkCount / binary.length;
  if (density < 0.015 || density > 0.65) return 0;

  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!binary[y * w + x]) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }

  if (maxX < minX || maxY < minY) return 0;

  const bw = maxX - minX + 1;
  const bh = maxY - minY + 1;
  if (bw < 4 || bh < 8) return 0;

  const regionDensity = (
    x0Ratio: number,
    y0Ratio: number,
    x1Ratio: number,
    y1Ratio: number,
  ) => {
    const x0 = minX + Math.floor(bw * x0Ratio);
    const y0 = minY + Math.floor(bh * y0Ratio);
    const x1 = minX + Math.max(Math.floor(bw * x1Ratio), Math.floor(bw * x0Ratio) + 1);
    const y1 = minY + Math.max(Math.floor(bh * y1Ratio), Math.floor(bh * y0Ratio) + 1);

    let dark = 0;
    let total = 0;
    for (let y = y0; y < Math.min(h, y1); y++) {
      for (let x = x0; x < Math.min(w, x1); x++) {
        total++;
        if (binary[y * w + x]) dark++;
      }
    }
    return total === 0 ? 0 : dark / total;
  };

  const seg = {
    top: regionDensity(0.2, 0.0, 0.8, 0.2) > 0.14,
    mid: regionDensity(0.2, 0.42, 0.8, 0.58) > 0.14,
    bot: regionDensity(0.2, 0.8, 0.8, 1.0) > 0.14,
    ul: regionDensity(0.0, 0.16, 0.32, 0.46) > 0.14,
    ur: regionDensity(0.68, 0.16, 1.0, 0.46) > 0.14,
    ll: regionDensity(0.0, 0.54, 0.32, 0.84) > 0.14,
    lr: regionDensity(0.68, 0.54, 1.0, 0.84) > 0.14,
  };

  const patterns: Record<number, typeof seg> = {
    0: { top: true, mid: false, bot: true, ul: true, ur: true, ll: true, lr: true },
    1: { top: false, mid: false, bot: false, ul: false, ur: true, ll: false, lr: true },
    2: { top: true, mid: true, bot: true, ul: false, ur: true, ll: true, lr: false },
    3: { top: true, mid: true, bot: true, ul: false, ur: true, ll: false, lr: true },
    4: { top: false, mid: true, bot: false, ul: true, ur: true, ll: false, lr: true },
    5: { top: true, mid: true, bot: true, ul: true, ur: false, ll: false, lr: true },
    6: { top: true, mid: true, bot: true, ul: true, ur: false, ll: true, lr: true },
    7: { top: true, mid: false, bot: false, ul: false, ur: true, ll: false, lr: true },
    8: { top: true, mid: true, bot: true, ul: true, ur: true, ll: true, lr: true },
    9: { top: true, mid: true, bot: true, ul: true, ur: true, ll: false, lr: true },
  };

  let bestDigit = 0;
  let bestScore = 0;
  const keys: (keyof typeof seg)[] = ["top", "mid", "bot", "ul", "ur", "ll", "lr"];
  for (let digit = 1; digit <= 9; digit++) {
    const target = patterns[digit];
    let matches = 0;
    for (const key of keys) {
      if (seg[key] === target[key]) matches++;
    }
    const score = matches / keys.length;
    if (score > bestScore) {
      bestScore = score;
      bestDigit = digit;
    }
  }

  // Reject uncertain predictions to avoid flooding wrong digits.
  if (bestScore < 0.74) return 0;

  // Tight vertical strokes are likely 1.
  if (bw / bh < 0.42 && seg.ur && seg.lr && !seg.top && !seg.mid && !seg.bot) return 1;

  return bestDigit;
}

export default function SudokuSolver() {
  const [grid, setGrid] = useState<Grid>(deepCopy(PRESETS.easy));
  const [givenCells, setGivenCells] = useState<boolean[][]>(
    PRESETS.easy.map((row) => row.map((v) => v !== 0)),
  );
  const [solvedCells, setSolvedCells] = useState<boolean[][]>(emptyBool());
  const [animGrid, setAnimGrid] = useState<Grid | null>(null);
  const [tryingCell, setTryingCell] = useState<{ r: number; c: number } | null>(
    null,
  );
  const [backtrackCell, setBacktrackCell] = useState<{
    r: number;
    c: number;
  } | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [animProgress, setAnimProgress] = useState(0);
  const [animTotal, setAnimTotal] = useState(0);
  const [speed, setSpeed] = useState<Speed>("normal");
  const [status, setStatus] = useState<string>("Unsolved");
  const [isSolving, setIsSolving] = useState(false);
  const [isOCRing, setIsOCRing] = useState(false);
  const [revealedCells, setRevealedCells] = useState<boolean[][]>(emptyBool());
  const [mistakes, setMistakes] = useState(0);
  const [wrongCells, setWrongCells] = useState<boolean[][]>(emptyBool());
  const [hintsUsed, setHintsUsed] = useState(0);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [solveAlgorithm, setSolveAlgorithm] =
    useState<SolveAlgorithm>("backtracking");
  const [manualSolved, setManualSolved] = useState(false);
  const [referenceSolution, setReferenceSolution] = useState<Grid | null>(() =>
    collectSolveSteps(PRESETS.easy).solution,
  );

  const fileRef = useRef<HTMLInputElement>(null);
  const stopRef = useRef(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const getDifficultyLabel = useCallback((baseGrid: Grid) => {
    const emptyCount = baseGrid.flat().filter((v) => v === 0).length;
    if (emptyCount >= 52) return "hard";
    if (emptyCount >= 42) return "medium";
    return "easy";
  }, []);

  useEffect(() => {
    if (!isTimerRunning) return;
    const timer = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isTimerRunning]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encoded = params.get("s");
    if (!encoded || encoded.length !== 81) return;

    const parsed: Grid = Array.from({ length: 9 }, (_, r) =>
      Array.from({ length: 9 }, (_, c) => Number(encoded[r * 9 + c])),
    );
    const allDigits = parsed.flat().every((n) => Number.isInteger(n) && n >= 0 && n <= 9);
    if (!allDigits) return;

    const solution = collectSolveSteps(parsed).solution;
    setGrid(parsed);
    setGivenCells(parsed.map((row) => row.map((v) => v !== 0)));
    setSolvedCells(emptyBool());
    setWrongCells(emptyBool());
    setRevealedCells(emptyBool());
    setReferenceSolution(solution);
    setStatus("Puzzle loaded from URL");
  }, []);

  const resetRunMetrics = useCallback(() => {
    setMistakes(0);
    setHintsUsed(0);
    setElapsedSeconds(0);
    setIsTimerRunning(false);
    setManualSolved(false);
    setWrongCells(emptyBool());
  }, []);

  const loadPreset = (level: "easy" | "medium" | "hard") => {
    const p = deepCopy(PRESETS[level]);
    const solution = collectSolveSteps(p).solution;
    setGrid(p);
    setGivenCells(p.map((row) => row.map((v) => v !== 0)));
    setSolvedCells(emptyBool());
    setAnimGrid(null);
    setRevealedCells(emptyBool());
    setReferenceSolution(solution);
    resetRunMetrics();
    setStatus(
      `${level.charAt(0).toUpperCase() + level.slice(1)} puzzle loaded`,
    );
  };

  const generateNewPuzzle = (level: "easy" | "medium" | "hard") => {
    const generated = generatePuzzle(level);
    const solution = collectSolveSteps(generated).solution;
    setGrid(generated);
    setGivenCells(generated.map((row) => row.map((v) => v !== 0)));
    setSolvedCells(emptyBool());
    setAnimGrid(null);
    setRevealedCells(emptyBool());
    setReferenceSolution(solution);
    resetRunMetrics();
    setStatus(`Generated ${level} puzzle`);
    toast.success(`Generated ${level} sudoku`);
  };

  const stopAnimation = useCallback(() => {
    stopRef.current = true;
    for (const t of timeoutsRef.current) clearTimeout(t);
    timeoutsRef.current = [];
    setIsAnimating(false);
    setIsSolving(false);
    setTryingCell(null);
    setBacktrackCell(null);
    setAnimProgress(0);
  }, []);

  const clearBoard = useCallback(() => {
    stopAnimation();
    setGrid(emptyGrid());
    setGivenCells(emptyBool());
    setSolvedCells(emptyBool());
    setAnimGrid(null);
    setRevealedCells(emptyBool());
    setReferenceSolution(null);
    resetRunMetrics();
    setStatus("Cleared");
  }, [stopAnimation, resetRunMetrics]);

  const completeManualSolve = useCallback(
    (nextGrid: Grid) => {
      setIsTimerRunning(false);
      setManualSolved(true);
      const score = Math.max(
        0,
        10000 - elapsedSeconds * 10 - mistakes * 250 - hintsUsed * 400,
      );
      setStatus(`Manual solved in ${formatElapsed(elapsedSeconds)} · score ${score}`);
      toast.success(`Solved! Score ${score}`);
      setSolvedCells(nextGrid.map((row, r) => row.map((v, c) => !givenCells[r][c] && v !== 0)));
      setRevealedCells(nextGrid.map((row) => row.map((v) => v !== 0)));

      addStat({
        id: `sudoku-manual-${Date.now()}`,
        algorithm: "Manual Solve",
        problem: "Sudoku",
        timestamp: Date.now(),
        duration: elapsedSeconds * 1000,
        stepsCount: nextGrid.flat().filter((v) => v !== 0).length,
        nodesExplored: nextGrid.flat().filter((v) => v !== 0).length,
        success: true,
        difficulty: getDifficultyLabel(nextGrid),
      });
    },
    [elapsedSeconds, mistakes, hintsUsed, givenCells, getDifficultyLabel],
  );

  const handleCellChange = (row: number, col: number, value: string) => {
    const num = Number.parseInt(value);
    const nextValue = Number.isNaN(num) || num < 1 || num > 9 ? 0 : num;
    const next = deepCopy(grid);
    next[row][col] = nextValue;

    if (!isTimerRunning && nextValue !== 0) {
      setIsTimerRunning(true);
    }

    setGrid(next);

    if (referenceSolution && nextValue !== 0) {
      const isWrong = nextValue !== referenceSolution[row][col];
      setWrongCells((old) => {
        const copy = old.map((r) => [...r]);
        copy[row][col] = isWrong;
        return copy;
      });
      if (isWrong) {
        setMistakes((m) => m + 1);
        setStatus("Incorrect move");
      }
    } else {
      setWrongCells((old) => {
        const copy = old.map((r) => [...r]);
        copy[row][col] = false;
        return copy;
      });
    }

    if (referenceSolution && isSolvedGrid(next)) {
      completeManualSolve(next);
    }

    setGivenCells((prev) => {
      const next = prev.map((r) => [...r]);
      next[row][col] = false;
      return next;
    });
    setSolvedCells(emptyBool());
    setAnimGrid(null);
    setRevealedCells(emptyBool());
    if (!manualSolved) setStatus("Unsolved");
  };

  const applyHint = () => {
    if (isAnimating || isSolving) return;

    const solution = referenceSolution ?? collectSolveSteps(grid).solution;
    if (!solution) {
      toast.error("No valid solution available for hints");
      return;
    }

    const candidates: [number, number][] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (givenCells[r][c]) continue;
        if (grid[r][c] !== solution[r][c]) candidates.push([r, c]);
      }
    }

    if (candidates.length === 0) {
      toast.info("No hint needed. Puzzle is already correct.");
      return;
    }

    const [r, c] = candidates[Math.floor(Math.random() * candidates.length)];
    const value = solution[r][c];

    const next = deepCopy(grid);
    next[r][c] = value;

    setGrid(next);
    setWrongCells((old) => {
      const copy = old.map((row) => [...row]);
      copy[r][c] = false;
      return copy;
    });
    setHintsUsed((h) => h + 1);
    setReferenceSolution(solution);
    setStatus(`Hint revealed cell R${r + 1}C${c + 1}`);
    toast.success("Hint applied");

    if (isSolvedGrid(next)) {
      completeManualSolve(next);
    }
  };

  const saveCurrentState = () => {
    const payload = {
      grid,
      givenCells,
      mistakes,
      hintsUsed,
      elapsedSeconds,
      timestamp: Date.now(),
    };
    localStorage.setItem("sudoku-progress", JSON.stringify(payload));
    toast.success("Puzzle state saved locally");
  };

  const loadSavedState = () => {
    const raw = localStorage.getItem("sudoku-progress");
    if (!raw) {
      toast.info("No saved puzzle found");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as {
        grid: Grid;
        givenCells: boolean[][];
        mistakes: number;
        hintsUsed: number;
        elapsedSeconds: number;
      };
      setGrid(parsed.grid);
      setGivenCells(parsed.givenCells);
      setMistakes(parsed.mistakes ?? 0);
      setHintsUsed(parsed.hintsUsed ?? 0);
      setElapsedSeconds(parsed.elapsedSeconds ?? 0);
      setSolvedCells(emptyBool());
      setAnimGrid(null);
      setWrongCells(emptyBool());
      setRevealedCells(emptyBool());
      setReferenceSolution(collectSolveSteps(parsed.grid).solution);
      setStatus("Loaded saved puzzle");
      toast.success("Loaded saved puzzle");
    } catch {
      toast.error("Failed to load saved puzzle");
    }
  };

  const sharePuzzle = async () => {
    const encoded = grid.flat().join("");
    const url = `${window.location.origin}${window.location.pathname}?s=${encoded}`;

    try {
      await navigator.clipboard.writeText(url);
      toast.success("Share URL copied");
    } catch {
      toast.error("Could not copy URL");
    }
  };

  const revealSolvedCells = useCallback((solvedMarkers: boolean[][]) => {
    const positions: { r: number; c: number; delay: number }[] = [];
    for (let r = 0; r < 9; r++) {
      for (let c = 0; c < 9; c++) {
        if (solvedMarkers[r][c]) {
          positions.push({ r, c, delay: (r * 9 + c) * 12 });
        }
      }
    }
    setRevealedCells(emptyBool());
    for (const { r, c, delay } of positions) {
      const t = setTimeout(() => {
        if (stopRef.current) return;
        setRevealedCells((prev) => {
          const next = prev.map((row) => [...row]);
          next[r][c] = true;
          return next;
        });
      }, delay);
      timeoutsRef.current.push(t);
    }
    const maxDelay = Math.max(...positions.map((p) => p.delay), 0);
    const finalT = setTimeout(() => {
      if (!stopRef.current) {
        setStatus("Solved! \u2713");
        toast.success("Puzzle solved!");
      }
    }, maxDelay + 50);
    timeoutsRef.current.push(finalT);
  }, []);

  const solve = useCallback(() => {
    const startedAt = Date.now();
    const initialGrid = deepCopy(grid);
    stopRef.current = false;
    timeoutsRef.current = [];
    setIsSolving(true);
    setIsAnimating(true);
    setIsTimerRunning(false);
    setAnimGrid(deepCopy(grid));
    setAnimProgress(0);
    setSolvedCells(emptyBool());
    setRevealedCells(emptyBool());
    setWrongCells(emptyBool());
    setStatus("Solving...");

    const { steps, solution } =
      solveAlgorithm === "backtracking"
        ? collectSolveSteps(grid)
        : collectConstraintSteps(grid);

    if (!solution) {
      setStatus("No solution found");
      toast.error("No valid solution exists for this puzzle");
      setIsAnimating(false);
      setIsSolving(false);
      addStat({
        id: `sudoku-${Date.now()}`,
        algorithm: solveAlgorithm === "constraint" ? "Constraint + BT" : "Backtracking",
        problem: "Sudoku",
        timestamp: Date.now(),
        duration: Math.max(1, Date.now() - startedAt),
        stepsCount: steps.length,
        nodesExplored: steps.length,
        success: false,
        difficulty: getDifficultyLabel(initialGrid),
      });
      return;
    }

    setAnimTotal(steps.length);
    const delay = SPEED_MS[speed];
    const workGrid = deepCopy(grid);

    const processStep = (index: number) => {
      if (stopRef.current) return;
      if (index >= steps.length) {
        const solvedMarkers = solution.map((row, r) =>
          row.map((_, c) => !givenCells[r][c] && grid[r][c] === 0),
        );
        setGrid(solution);
        setAnimGrid(null);
        setSolvedCells(solvedMarkers);
        setTryingCell(null);
        setBacktrackCell(null);
        setIsAnimating(false);
        setIsSolving(false);
        setAnimProgress(steps.length);
        revealSolvedCells(solvedMarkers);

        addStat({
          id: `sudoku-${Date.now()}`,
          algorithm: solveAlgorithm === "constraint" ? "Constraint + BT" : "Backtracking",
          problem: "Sudoku",
          timestamp: Date.now(),
          duration: Math.max(1, Date.now() - startedAt),
          stepsCount: steps.length,
          nodesExplored: steps.length,
          success: true,
          difficulty: getDifficultyLabel(initialGrid),
        });
        return;
      }

      const step = steps[index];
      if (step.type === "try") {
        workGrid[step.row][step.col] = step.value;
        setAnimGrid(deepCopy(workGrid));
        setTryingCell({ r: step.row, c: step.col });
        setBacktrackCell(null);
      } else if (step.type === "backtrack") {
        workGrid[step.row][step.col] = 0;
        setAnimGrid(deepCopy(workGrid));
        setBacktrackCell({ r: step.row, c: step.col });
        setTryingCell(null);
      } else if (step.type === "place") {
        setTryingCell(null);
        setBacktrackCell(null);
      }

      setAnimProgress(index + 1);
      const t = setTimeout(() => processStep(index + 1), delay);
      timeoutsRef.current.push(t);
    };

    processStep(0);
  }, [grid, givenCells, speed, revealSolvedCells, solveAlgorithm, getDifficultyLabel]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image too large. Please use an image under 10MB.");
      if (fileRef.current) fileRef.current.value = "";
      return;
    }
    setIsOCRing(true);
    setStatus("Reading puzzle from image...");
    try {
      const extracted = await extractGridFromImage(file);
      const nonZero = extracted.flat().filter((v) => v !== 0).length;
      const solution = collectSolveSteps(extracted).solution;
      setGrid(extracted);
      setGivenCells(extracted.map((row) => row.map((v) => v !== 0)));
      setSolvedCells(emptyBool());
      setAnimGrid(null);
      setRevealedCells(emptyBool());
      setReferenceSolution(solution);
      resetRunMetrics();
      if (nonZero >= 17) {
        setStatus(`Detected ${nonZero} digits from image`);
        toast.success(`Extracted ${nonZero} digits from image`);
      } else {
        setStatus(`Low-confidence extraction (${nonZero} digits) \u2014 review/edit cells`);
        toast.info("Image parsed with low confidence. Please verify recognized cells.");
      }
    } catch {
      toast.error("Failed to read image");
      setStatus("Image read failed");
    } finally {
      setIsOCRing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const displayGrid = animGrid ?? grid;

  const getCellState = (row: number, col: number): CellState => {
    if (backtrackCell?.r === row && backtrackCell?.c === col)
      return "backtracking";
    if (tryingCell?.r === row && tryingCell?.c === col) return "trying";
    if (solvedCells[row]?.[col]) return "solved";
    if (givenCells[row]?.[col]) return "given";
    if (wrongCells[row]?.[col]) return "mistake";
    if (displayGrid[row]?.[col] !== 0) return "user";
    return "empty";
  };

  const progressPct =
    animTotal > 0 ? Math.round((animProgress / animTotal) * 100) : 0;

  const statusColor =
    status.includes("Solved") || status.includes("Detected")
      ? "text-emerald-400"
      : status.includes("No solution") || status.includes("failed")
        ? "text-red-400"
        : status.includes("Solving") || status.includes("Reading")
          ? "text-cyan-400 animate-pulse"
          : "text-muted-foreground";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-border bg-card card-glow p-6 flex flex-col gap-5"
      data-ocid="sudoku.card"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-xl tracking-wide">
            SUDOKU SOLVER
          </h2>
          <p className={`text-sm mt-0.5 ${statusColor}`}>{status}</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center purple-glow">
          <span className="text-white text-lg">🧩</span>
        </div>
      </div>

      {/* Controls Row 1 */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-muted-foreground font-medium">Load:</span>
        {(["easy", "medium", "hard"] as const).map((level) => (
          <button
            type="button"
            key={level}
            onClick={() => loadPreset(level)}
            disabled={isAnimating}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:border-purple-500/50 hover:bg-purple-500/10 transition-all capitalize disabled:opacity-40"
            data-ocid={`sudoku.${level}_button`}
          >
            {level}
          </button>
        ))}
        <span className="text-xs text-muted-foreground font-medium ml-2">
          Generate:
        </span>
        {(["easy", "medium", "hard"] as const).map((level) => (
          <button
            type="button"
            key={`gen-${level}`}
            onClick={() => generateNewPuzzle(level)}
            disabled={isAnimating}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all capitalize disabled:opacity-40"
          >
            <Sparkles size={11} className="inline mr-1" />
            {level}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
            id="sudoku-image-upload"
          />
          <label
            htmlFor="sudoku-image-upload"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:border-cyan-500/50 hover:bg-cyan-500/10 cursor-pointer transition-all"
            data-ocid="sudoku.upload_button"
          >
            {isOCRing ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <ImageIcon size={13} />
            )}
            {isOCRing ? "Reading..." : "Upload Image"}
          </label>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          onClick={applyHint}
          disabled={isAnimating || isSolving}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-amber-500/40 hover:bg-amber-500/10 transition-all disabled:opacity-40"
        >
          <Lightbulb size={12} className="inline mr-1" />
          Hint
        </button>
        <button
          type="button"
          onClick={saveCurrentState}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-accent transition-all"
        >
          <Save size={12} className="inline mr-1" />
          Save
        </button>
        <button
          type="button"
          onClick={loadSavedState}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-accent transition-all"
        >
          <FolderOpen size={12} className="inline mr-1" />
          Load
        </button>
        <button
          type="button"
          onClick={sharePuzzle}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border hover:bg-accent transition-all"
        >
          <Copy size={12} className="inline mr-1" />
          Share URL
        </button>

        <div className="ml-auto flex items-center gap-1 rounded-lg border border-border p-0.5">
          {(["backtracking", "constraint"] as const).map((algo) => (
            <button
              type="button"
              key={algo}
              onClick={() => setSolveAlgorithm(algo)}
              disabled={isAnimating}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-all disabled:opacity-40 ${
                solveAlgorithm === algo
                  ? "bg-cyan-600 text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
            >
              {algo === "constraint" ? "Constraint + BT" : "Backtracking"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-lg border border-border p-2 text-center">
          <p className="text-[11px] text-muted-foreground">Timer</p>
          <p className="font-semibold">{formatElapsed(elapsedSeconds)}</p>
        </div>
        <div className="rounded-lg border border-border p-2 text-center">
          <p className="text-[11px] text-muted-foreground">Mistakes</p>
          <p className="font-semibold text-red-400">{mistakes}</p>
        </div>
        <div className="rounded-lg border border-border p-2 text-center">
          <p className="text-[11px] text-muted-foreground">Hints Used</p>
          <p className="font-semibold text-amber-400">{hintsUsed}</p>
        </div>
        <div className="rounded-lg border border-border p-2 text-center">
          <p className="text-[11px] text-muted-foreground">Score</p>
          <p className="font-semibold text-emerald-400">
            {Math.max(0, 10000 - elapsedSeconds * 10 - mistakes * 250 - hintsUsed * 400)}
          </p>
        </div>
      </div>

      {/* Sudoku Grid */}
      <div className="flex justify-center">
        <div
          className="inline-grid grid-cols-9 gap-0 rounded-xl overflow-hidden border-2 border-border"
          data-ocid="sudoku.table"
        >
          {displayGrid.map((row, r) =>
            row.map((value, c) => {
              const state = getCellState(r, c);
              const isBorderRight = (c + 1) % 3 === 0 && c < 8;
              const isBorderBottom = (r + 1) % 3 === 0 && r < 8;
              const isRevealed = revealedCells[r]?.[c];

              const bgClass =
                state === "backtracking"
                  ? "dark:bg-red-900/50 bg-red-100"
                  : state === "mistake"
                    ? "dark:bg-red-900/30 bg-red-50"
                  : state === "trying"
                    ? "dark:bg-amber-900/50 bg-amber-50"
                    : state === "given"
                      ? "dark:bg-slate-800/80 bg-slate-100"
                      : state === "solved"
                        ? "dark:bg-cyan-900/20 bg-cyan-50"
                        : state === "user"
                          ? "dark:bg-purple-900/15 bg-purple-50"
                          : "dark:bg-slate-900/50 bg-white hover:dark:bg-slate-800/50 hover:bg-slate-50";

              const textClass =
                state === "backtracking"
                  ? "text-red-400"
                  : state === "mistake"
                    ? "text-red-500"
                  : state === "trying"
                    ? "text-amber-400"
                    : state === "given"
                      ? "text-foreground"
                      : state === "solved"
                        ? "text-cyan-500"
                        : state === "user"
                          ? "text-purple-500"
                          : "text-foreground";

              const borderClass = [
                isBorderRight
                  ? "border-r-2 dark:border-r-slate-500 border-r-slate-400"
                  : "border-r dark:border-r-slate-700 border-r-slate-200",
                isBorderBottom
                  ? "border-b-2 dark:border-b-slate-500 border-b-slate-400"
                  : "border-b dark:border-b-slate-700 border-b-slate-200",
              ].join(" ");

              const isEditable = state === "empty" || state === "user";
              const displayValue = value === 0 ? "" : String(value);

              return (
                <div
                  // biome-ignore lint/suspicious/noArrayIndexKey: fixed 9x9 grid
                  key={`${r}-${c}`}
                  className={`relative w-9 h-9 sm:w-10 sm:h-10 ${bgClass} ${borderClass} transition-colors duration-75 overflow-hidden`}
                >
                  {isEditable && !isAnimating ? (
                    <input
                      type="text"
                      inputMode="numeric"
                      aria-label={`Sudoku cell row ${r + 1} column ${c + 1}`}
                      maxLength={1}
                      value={displayValue}
                      onChange={(e) => handleCellChange(r, c, e.target.value)}
                      className={`absolute inset-0 w-full h-full text-center text-sm font-bold outline-none bg-transparent ${textClass} focus:dark:bg-purple-900/30 focus:bg-purple-50`}
                      data-ocid="sudoku.input"
                    />
                  ) : (
                    <>
                      {state === "given" && (
                        <span
                          className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${textClass}`}
                        >
                          {displayValue}
                        </span>
                      )}

                      {/* Backtracking flash */}
                      <AnimatePresence mode="popLayout">
                        {state === "backtracking" && (
                          <motion.span
                            // biome-ignore lint/suspicious/noArrayIndexKey: fixed 9x9 grid
                            key={`bt-${r}-${c}`}
                            initial={{ scale: 1.3, opacity: 1 }}
                            animate={{ scale: 1, opacity: 0.7 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ duration: 0.12 }}
                            className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${textClass}`}
                          >
                            {displayValue || "\u2715"}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      {/* Trying pulse */}
                      <AnimatePresence mode="popLayout">
                        {state === "trying" && displayValue && (
                          <motion.span
                            key={`try-${r}-${c}-${displayValue}`}
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1.1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.1 }}
                            className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${textClass}`}
                          >
                            {displayValue}
                          </motion.span>
                        )}
                      </AnimatePresence>

                      {/* Non-animated filled cell */}
                      {(state === "user" ||
                        (state === "empty" && isAnimating && displayValue)) && (
                        <span
                          className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${textClass}`}
                        >
                          {displayValue}
                        </span>
                      )}

                      {/* Solved cell reveal */}
                      <AnimatePresence>
                        {state === "solved" && isRevealed && (
                          <motion.span
                            // biome-ignore lint/suspicious/noArrayIndexKey: fixed 9x9 grid
                            key={`solved-${r}-${c}`}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 20,
                            }}
                            className={`absolute inset-0 flex items-center justify-center text-sm font-bold ${textClass}`}
                          >
                            {displayValue}
                          </motion.span>
                        )}
                        {state === "solved" && !isRevealed && (
                          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold opacity-0">
                            {displayValue}
                          </span>
                        )}
                      </AnimatePresence>
                    </>
                  )}
                </div>
              );
            }),
          )}
        </div>
      </div>

      {/* Progress bar during animation */}
      <AnimatePresence>
        {isAnimating && animTotal > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="flex flex-col gap-1.5"
            data-ocid="sudoku.loading_state"
          >
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Backtracking steps</span>
              <span>
                {animProgress.toLocaleString()} / {animTotal.toLocaleString()} (
                {progressPct}%)
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-purple-500"
                initial={{ width: "0%" }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Controls Row 2 */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={clearBoard}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-border hover:bg-accent transition-all"
          data-ocid="sudoku.secondary_button"
        >
          <RotateCcw size={14} />
          Clear
        </button>

        {/* Speed selector */}
        <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
          {(["slow", "normal", "fast"] as Speed[]).map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => setSpeed(s)}
              disabled={isAnimating}
              className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize transition-all disabled:opacity-40 ${
                speed === s
                  ? "bg-purple-600 text-white"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              }`}
              data-ocid={`sudoku.${s}_button`}
            >
              {s}
            </button>
          ))}
        </div>

        {isAnimating ? (
          <button
            type="button"
            onClick={stopAnimation}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-red-600 to-red-700 text-white hover:opacity-90 transition-all"
            data-ocid="sudoku.cancel_button"
          >
            <Square size={14} />
            Stop
          </button>
        ) : (
          <button
            type="button"
            onClick={solve}
            disabled={isSolving || isOCRing}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:opacity-90 transition-all disabled:opacity-50 purple-glow"
            data-ocid="sudoku.primary_button"
          >
            {isSolving && !isAnimating ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Solving...
              </>
            ) : (
              <>
                <Play size={14} />
                {solveAlgorithm === "constraint"
                  ? "Solve (Constraint + BT)"
                  : "Solve Sudoku"}
              </>
            )}
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded dark:bg-slate-700 bg-slate-200 border border-border" />
          Given
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-cyan-500/20 border border-cyan-500/30" />
          Solved
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-purple-500/20 border border-purple-500/30" />
          User input
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" />
          Mistake
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-amber-500/20 border border-amber-500/30" />
          Trying
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-500/20 border border-red-500/30" />
          Backtrack
        </span>
        <span className="ml-auto flex items-center gap-1 text-muted-foreground/60">
          <Upload size={11} />
          Upload a sudoku image for auto-fill
        </span>
      </div>
    </motion.div>
  );
}
