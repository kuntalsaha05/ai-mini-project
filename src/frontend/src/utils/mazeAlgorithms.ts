type Cell = {
  visited: boolean;
  walls: { N: boolean; S: boolean; E: boolean; W: boolean };
};

type MazeGrid = Cell[][];

export class MazeSolver {
  private grid: MazeGrid;
  private rows: number;
  private cols: number;

  constructor(rows: number, cols: number) {
    this.rows = rows;
    this.cols = cols;
    this.grid = this.initializeGrid();
    this.generateMaze();
  }

  private initializeGrid(): MazeGrid {
    return Array.from({ length: this.rows }, () =>
      Array.from({ length: this.cols }, () => ({
        visited: false,
        walls: { N: true, S: true, E: true, W: true },
      })),
    );
  }

  private generateMaze(): void {
    const grid = this.grid;
    const rows = this.rows;
    const cols = this.cols;

    const carve = (r: number, c: number) => {
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
  }

  getMaze(): MazeGrid {
    return this.grid;
  }

  getRows(): number {
    return this.rows;
  }

  getCols(): number {
    return this.cols;
  }
}
