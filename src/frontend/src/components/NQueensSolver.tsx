import { Play, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { addStat } from "../utils/statistics";
import { playSound } from "../utils/soundEffects";

interface QueensState {
  board: boolean[][];
  conflicts: Set<string>;
  solving: boolean;
  solved: boolean;
  steps: number;
}

function solveNQueens(n: number, onStep: (board: boolean[][], step: number) => void): Promise<boolean> {
  return new Promise((resolve) => {
    let stepCount = 0;
    const board: boolean[][] = Array(n).fill(null).map(() => Array(n).fill(false));
    const cols = new Set<number>();
    const posDiag = new Set<number>();
    const negDiag = new Set<number>();

    async function solve(row: number): Promise<boolean> {
      if (row === n) {
        stepCount++;
        onStep([...board.map((r) => [...r])], stepCount);
        return true;
      }

      for (let col = 0; col < n; col++) {
        const posd = row - col;
        const negd = row + col;

        if (!cols.has(col) && !posDiag.has(posd) && !negDiag.has(negd)) {
          board[row][col] = true;
          cols.add(col);
          posDiag.add(posd);
          negDiag.add(negd);

          stepCount++;
          onStep([...board.map((r) => [...r])], stepCount);
          await new Promise((r) => setTimeout(r, 100));

          if (await solve(row + 1)) {
            return true;
          }

          board[row][col] = false;
          cols.delete(col);
          posDiag.delete(posd);
          negDiag.delete(negd);

          stepCount++;
          onStep([...board.map((r) => [...r])], stepCount);
          await new Promise((r) => setTimeout(r, 50));
        }
      }

      return false;
    }

    solve(0).then(() => resolve(true));
  });
}

export default function NQueensSolver() {
  const [boardSize, setBoardSize] = useState(8);
  const [state, setState] = useState<QueensState>({
    board: Array(8).fill(null).map(() => Array(8).fill(false)),
    conflicts: new Set(),
    solving: false,
    solved: false,
    steps: 0,
  });
  const startTimeRef = useRef<number>(0);

  const handleSolve = async () => {
    setState((s) => ({ ...s, solving: true, solved: false, steps: 0 }));
    startTimeRef.current = Date.now();

    const newBoard = Array(boardSize).fill(null).map(() => Array(boardSize).fill(false));
    const result = await solveNQueens(boardSize, (board, step) => {
      setState((s) => ({ ...s, board, steps: step }));
      playSound("stepComplete");
    });

    const duration = Date.now() - startTimeRef.current;

    addStat({
      id: `nqueens-${Date.now()}`,
      algorithm: "N-Queens",
      problem: `${boardSize}-Queens`,
      timestamp: Date.now(),
      duration,
      stepsCount: state.steps,
      nodesExplored: state.steps,
      success: result,
    });

    setState((s) => ({ ...s, solving: false, solved: result }));
    if (result) playSound("solved");
  };

  const handleReset = () => {
    setState({
      board: Array(boardSize).fill(null).map(() => Array(boardSize).fill(false)),
      conflicts: new Set(),
      solving: false,
      solved: false,
      steps: 0,
    });
  };

  const handleSizeChange = (size: number) => {
    setBoardSize(size);
    handleReset();
  };

  return (
    <div className="p-6 rounded-2xl border border-border bg-card">
      <h2 className="font-display font-bold text-2xl mb-4 flex items-center gap-2">
        <span>♛</span> N-Queens Solver
      </h2>

      <div className="mb-6 flex gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Board Size</label>
          <select
            value={boardSize}
            onChange={(e) => handleSizeChange(Number(e.target.value))}
            disabled={state.solving}
            className="px-3 py-2 rounded-lg border border-border bg-background"
          >
            {[4, 5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n}×{n}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 items-end">
          <button
            onClick={handleSolve}
            disabled={state.solving}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-400 to-cyan-500 text-slate-900 font-semibold flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
          >
            <Play size={16} /> Solve
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg border border-border hover:bg-accent flex items-center gap-2"
          >
            <RotateCcw size={16} /> Reset
          </button>
        </div>
      </div>

      <div className="mb-4 p-3 rounded-lg bg-muted text-sm">
        Steps: <span className="font-bold">{state.steps}</span> | Solved:{" "}
        <span className="font-bold">{state.solved ? "✓" : "..."}</span>
      </div>

      <div className="inline-block p-2 bg-muted rounded-lg">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${boardSize}, 1fr)` }}>
          {state.board.map((row, r) =>
            row.map((hasQueen, c) => (
              <motion.div
                key={`${r}-${c}`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${
                  hasQueen ? "bg-yellow-500 text-slate-900" : "bg-slate-700"
                }`}
              >
                {hasQueen ? "♛" : ""}
              </motion.div>
            )),
          )}
        </div>
      </div>

      <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm">
        <p className="font-semibold mb-2">Algorithm: Backtracking</p>
        <p className="text-xs text-muted-foreground">
          Places queens row by row, backtracking when conflicts are detected. Time: O(N!), Space: O(N).
        </p>
      </div>
    </div>
  );
}
