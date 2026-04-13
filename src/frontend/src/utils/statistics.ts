export interface SolveStatistics {
  id: string;
  algorithm: string;
  problem: string;
  timestamp: number;
  duration: number; // milliseconds
  stepsCount: number;
  nodesExplored: number;
  success: boolean;
  difficulty?: string;
}

export interface StorageData {
  savedPuzzles: Record<string, any>;
  statistics: SolveStatistics[];
  preferences: {
    theme: "light" | "dark";
    soundEnabled: boolean;
    animationSpeed: "slow" | "medium" | "fast";
  };
}

const STORAGE_KEY = "ai-solve-lab";

export function loadStats(): SolveStatistics[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const parsed: StorageData = JSON.parse(data);
    return parsed.statistics || [];
  } catch {
    return [];
  }
}

export function saveStats(stats: SolveStatistics[]): void {
  try {
    const existing = localStorage.getItem(STORAGE_KEY);
    const data: StorageData = existing ? JSON.parse(existing) : {
      savedPuzzles: {},
      statistics: [],
      preferences: {
        theme: "dark",
        soundEnabled: true,
        animationSpeed: "medium",
      },
    };
    data.statistics = stats;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Failed to save stats:", e);
  }
}

export function addStat(stat: SolveStatistics): void {
  const stats = loadStats();
  stats.push(stat);
  saveStats(stats);
}

export function getStatsByAlgorithm(algorithm: string): SolveStatistics[] {
  return loadStats().filter((s) => s.algorithm === algorithm);
}

export function getAverageTime(algorithm: string): number {
  const stats = getStatsByAlgorithm(algorithm);
  if (stats.length === 0) return 0;
  const total = stats.reduce((sum, s) => sum + s.duration, 0);
  return Math.round(total / stats.length);
}

export function getSuccessRate(algorithm: string): number {
  const stats = getStatsByAlgorithm(algorithm);
  if (stats.length === 0) return 0;
  const successes = stats.filter((s) => s.success).length;
  return Math.round((successes / stats.length) * 100);
}
