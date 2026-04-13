import { Play, RotateCcw } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { addStat } from "../utils/statistics";
import { playSound } from "../utils/soundEffects";

interface Node {
  id: number;
  x: number;
  y: number;
}

interface Edge {
  from: number;
  to: number;
  weight: number;
}

interface DijkstraState {
  nodes: Node[];
  edges: Edge[];
  distances: Map<number, number>;
  visited: Set<number>;
  current: number | null;
  path: number[];
  solving: boolean;
}

const INITIAL_NODES: Node[] = [
  { id: 0, x: 100, y: 100 },
  { id: 1, x: 250, y: 80 },
  { id: 2, x: 400, y: 120 },
  { id: 3, x: 150, y: 250 },
  { id: 4, x: 320, y: 280 },
  { id: 5, x: 450, y: 250 },
];

const INITIAL_EDGES: Edge[] = [
  { from: 0, to: 1, weight: 4 },
  { from: 0, to: 3, weight: 2 },
  { from: 1, to: 2, weight: 1 },
  { from: 1, to: 4, weight: 5 },
  { from: 2, to: 5, weight: 3 },
  { from: 3, to: 4, weight: 1 },
  { from: 4, to: 5, weight: 2 },
];

async function dijkstra(
  nodes: Node[],
  edges: Edge[],
  start: number,
  onStep: (state: Partial<DijkstraState>) => void,
): Promise<Map<number, number>> {
  const distances = new Map<number, number>();
  const visited = new Set<number>();
  const previous = new Map<number, number | null>();

  nodes.forEach((n) => {
    distances.set(n.id, n.id === start ? 0 : Infinity);
    previous.set(n.id, null);
  });

  while (visited.size < nodes.length) {
    let minDist = Infinity;
    let minNode = -1;

    distances.forEach((dist, node) => {
      if (!visited.has(node) && dist < minDist) {
        minDist = dist;
        minNode = node;
      }
    });

    if (minNode === -1) break;

    visited.add(minNode);
    onStep({ current: minNode, visited: new Set(visited) });
    playSound("stepComplete");
    await new Promise((r) => setTimeout(r, 200));

    edges.forEach((edge) => {
      if (edge.from === minNode && !visited.has(edge.to)) {
        const newDist = (distances.get(minNode) || 0) + edge.weight;
        if (newDist < (distances.get(edge.to) || Infinity)) {
          distances.set(edge.to, newDist);
          previous.set(edge.to, minNode);
          onStep({ distances: new Map(distances) });
        }
      }
    });
  }

  return distances;
}

export default function DijkstraSolver() {
  const [state, setState] = useState<DijkstraState>({
    nodes: INITIAL_NODES,
    edges: INITIAL_EDGES,
    distances: new Map(INITIAL_NODES.map((n) => [n.id, Infinity])),
    visited: new Set(),
    current: null,
    path: [],
    solving: false,
  });
  const [startNode, setStartNode] = useState(0);
  const startTimeRef = useRef<number>(0);

  const handleSolve = async () => {
    setState((s) => ({
      ...s,
      solving: true,
      distances: new Map(),
      visited: new Set(),
      current: null,
    }));
    startTimeRef.current = Date.now();

    const distances = await dijkstra(state.nodes, state.edges, startNode, (partial) => {
      setState((s) => ({ ...s, ...partial }));
    });

    const duration = Date.now() - startTimeRef.current;
    addStat({
      id: `dijkstra-${Date.now()}`,
      algorithm: "Dijkstra's",
      problem: `Shortest path from node ${startNode}`,
      timestamp: Date.now(),
      duration,
      stepsCount: state.visited.size,
      nodesExplored: state.visited.size,
      success: true,
    });

    setState((s) => ({ ...s, solving: false }));
    playSound("solved");
  };

  const handleReset = () => {
    setState({
      nodes: INITIAL_NODES,
      edges: INITIAL_EDGES,
      distances: new Map(INITIAL_NODES.map((n) => [n.id, Infinity])),
      visited: new Set(),
      current: null,
      path: [],
      solving: false,
    });
  };

  return (
    <div className="p-6 rounded-2xl border border-border bg-card">
      <h2 className="font-display font-bold text-2xl mb-4 flex items-center gap-2">
        <span>🌐</span> Dijkstra's Shortest Path
      </h2>

      <div className="mb-6 flex gap-4">
        <div>
          <label className="text-sm font-medium mb-2 block">Start Node</label>
          <select
            value={startNode}
            onChange={(e) => setStartNode(Number(e.target.value))}
            disabled={state.solving}
            className="px-3 py-2 rounded-lg border border-border bg-background"
          >
            {state.nodes.map((n) => (
              <option key={n.id} value={n.id}>
                Node {n.id}
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

      <svg width="100%" height="300" className="border border-border rounded-lg bg-muted mb-4">
        {/* Edges */}
        {state.edges.map((edge, i) => {
          const fromNode = state.nodes.find((n) => n.id === edge.from)!;
          const toNode = state.nodes.find((n) => n.id === edge.to)!;
          return (
            <g key={`edge-${i}`}>
              <line
                x1={fromNode.x}
                y1={fromNode.y}
                x2={toNode.x}
                y2={toNode.y}
                stroke={`rgba(100, 200, 255, 0.5)`}
                strokeWidth="2"
              />
              <text
                x={(fromNode.x + toNode.x) / 2}
                y={(fromNode.y + toNode.y) / 2}
                textAnchor="middle"
                className="fill-muted-foreground text-xs"
              >
                {edge.weight}
              </text>
            </g>
          );
        })}

        {/* Nodes */}
        {state.nodes.map((node) => (
          <motion.g key={`node-${node.id}`}>
            <circle
              cx={node.x}
              cy={node.y}
              r="20"
              className={`${
                node.id === state.current
                  ? "fill-yellow-500"
                  : state.visited.has(node.id)
                    ? "fill-cyan-500"
                    : "fill-slate-600"
              }`}
            />
            <text
              x={node.x}
              y={node.y + 5}
              textAnchor="middle"
              className="fill-slate-900 font-bold text-sm"
            >
              {node.id}
            </text>
          </motion.g>
        ))}
      </svg>

      <div className="grid grid-cols-2 gap-4 text-sm">
        <div className="p-3 rounded-lg bg-muted">
          <p className="font-semibold mb-2">Distances from Node {startNode}</p>
          {state.nodes.map((n) => (
            <div key={n.id} className="flex justify-between text-xs">
              <span>Node {n.id}:</span>
              <span className="font-mono">
                {state.distances.get(n.id) === Infinity ? "∞" : state.distances.get(n.id)}
              </span>
            </div>
          ))}
        </div>

        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <p className="font-semibold mb-2">Algorithm</p>
          <p className="text-xs text-muted-foreground">
            Greedy algorithm finding shortest paths. Time: O((V+E)log V), Space: O(V).
          </p>
        </div>
      </div>
    </div>
  );
}
