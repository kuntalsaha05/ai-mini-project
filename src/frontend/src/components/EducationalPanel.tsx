import { ChevronDown } from "lucide-react";
import { useState } from "react";

interface AlgorithmInfo {
  name: string;
  description: string;
  timeComplexity: string;
  spaceComplexity: string;
  pseudocode: string;
  pros: string[];
  cons: string[];
}

const ALGORITHMS: Record<string, AlgorithmInfo> = {
  sudoku: {
    name: "Sudoku Solver (Backtracking)",
    description:
      "A constraint satisfaction algorithm that recursively tries to place numbers 1-9 in empty cells, backtracking when conflicts are detected.",
    timeComplexity: "O(9^(n×n)) worst case, O(1) average",
    spaceComplexity: "O(n²) for grid + recursion stack",
    pseudocode: `function solveSudoku(grid):
  for each empty cell:
    for num = 1 to 9:
      if isValid(grid, row, col, num):
        place num
        if solveSudoku(grid):
          return true
        remove num
    return false
  return true`,
    pros: ["Optimal for constraint solving", "Finds all solutions"],
    cons: ["Exponential time complexity", "Slow for highly constrained puzzles"],
  },
  maze: {
    name: "Maze Solver (BFS & A*)",
    description:
      "BFS explores all neighbors level by level. A* uses heuristics to prioritize promising paths, finding shortest routes efficiently.",
    timeComplexity: "O(V + E) for BFS, O((V+E)log V) for A*",
    spaceComplexity: "O(V) for both algorithms",
    pseudocode: `function bfs(maze, start, goal):
  queue = [start]
  visited = {start}
  while queue not empty:
    node = queue.pop()
    if node == goal: return path
    for neighbor in getNeighbors(node):
      if neighbor not visited:
        visited.add(neighbor)
        queue.push(neighbor)`,
    pros: ["Guarantees shortest path with BFS", "A* very efficient with good heuristic"],
    cons: ["A* requires good heuristic design"],
  },
  nqueens: {
    name: "N-Queens Solver (Backtracking)",
    description:
      "Places queens on a chessboard such that no two queens threaten each other, backtracking when conflicts occur.",
    timeComplexity: "O(N!) worst case",
    spaceComplexity: "O(N) recursion depth",
    pseudocode: `function solveNQueens(row, columns, diagonals):
  if row == N:
    return solution found
  for col in range(N):
    if col not in columns and diagonals valid:
      place queen
      if solveNQueens(row+1, ...):
        return true
      remove queen
  return false`,
    pros: ["Explores solution space systematically", "Pruning works well"],
    cons: ["Solution count grows factorially"],
  },
  dijkstra: {
    name: "Dijkstra's Shortest Path",
    description:
      "Greedy algorithm that finds the shortest path from a source to all other nodes in a weighted graph with non-negative weights.",
    timeComplexity: "O((V+E)log V) with min-heap",
    spaceComplexity: "O(V) for distance and visited sets",
    pseudocode: `function dijkstra(graph, start):
  distances = {all: infinity, start: 0}
  visited = empty
  while unvisited nodes remain:
    current = node with min distance
    for neighbor in graph[current]:
      newDist = distances[current] + weight
      if newDist < distances[neighbor]:
        distances[neighbor] = newDist
  return distances`,
    pros: ["Optimal solution", "Efficient with proper data structures"],
    cons: ["Doesn't work with negative weights"],
  },
};

export default function EducationalPanel() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const algorithms = Object.entries(ALGORITHMS);

  return (
    <div className="p-6 rounded-2xl border border-border bg-card">
      <h2 className="font-display font-bold text-2xl mb-6">📚 Algorithm Guide</h2>

      <div className="space-y-4">
        {algorithms.map(([key, algo]) => (
          <div key={key} className="border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setExpanded(expanded === key ? null : key)}
              className="w-full p-4 flex items-center justify-between hover:bg-accent/50 transition-colors"
            >
              <div className="text-left">
                <h3 className="font-semibold">{algo.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{algo.description}</p>
              </div>
              <ChevronDown
                size={20}
                className={`transition-transform flex-shrink-0 ${expanded === key ? "rotate-180" : ""}`}
              />
            </button>

            {expanded === key && (
              <div className="p-4 border-t border-border bg-muted/50 space-y-4">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Complexity Analysis</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Time Complexity</p>
                      <p className="font-mono text-cyan-400">{algo.timeComplexity}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Space Complexity</p>
                      <p className="font-mono text-purple-400">{algo.spaceComplexity}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Pseudocode</h4>
                  <pre className="bg-slate-900 p-3 rounded text-xs overflow-x-auto text-green-400">
                    {algo.pseudocode}
                  </pre>
                </div>

                <div>
                  <h4 className="font-semibold text-sm mb-2">Pros & Cons</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-green-400 font-semibold mb-1">✓ Pros</p>
                      <ul className="text-xs space-y-1">
                        {algo.pros.map((pro, i) => (
                          <li key={i}>• {pro}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-red-400 font-semibold mb-1">✗ Cons</p>
                      <ul className="text-xs space-y-1">
                        {algo.cons.map((con, i) => (
                          <li key={i}>• {con}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-sm">
        <p className="font-semibold mb-2">💡 Learning Tips</p>
        <ul className="text-xs space-y-1 text-muted-foreground">
          <li>• Use slow speed to understand each algorithm step</li>
          <li>• Watch how backtracking explores the solution space</li>
          <li>• Compare algorithms with the same problem</li>
          <li>• Study complexity analysis to predict performance</li>
        </ul>
      </div>
    </div>
  );
}
