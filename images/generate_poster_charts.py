from pathlib import Path

import matplotlib.pyplot as plt

OUT = Path(__file__).resolve().parent
OUT.mkdir(parents=True, exist_ok=True)

plt.style.use("seaborn-v0_8-whitegrid")


def save_bar_chart(filename: str, title: str, x_labels: list[str], values: list[float], y_label: str, color: str):
    fig, ax = plt.subplots(figsize=(10, 6), dpi=180)
    bars = ax.bar(x_labels, values, color=color, edgecolor="#1f2937", linewidth=0.8)

    ax.set_title(title, fontsize=16, fontweight="bold", pad=12)
    ax.set_xlabel("Algorithms / Levels", fontsize=12)
    ax.set_ylabel(y_label, fontsize=12)
    ax.tick_params(axis="x", rotation=15)

    for bar, val in zip(bars, values):
        ax.text(
            bar.get_x() + bar.get_width() / 2,
            bar.get_height(),
            f"{val}",
            ha="center",
            va="bottom",
            fontsize=10,
            fontweight="semibold",
        )

    fig.tight_layout()
    fig.savefig(OUT / filename, bbox_inches="tight")
    plt.close(fig)


# 1) Maze algorithm runtime (ms) - medium maze benchmark profile
maze_algos = ["BFS", "DFS", "A*", "Dijkstra", "Greedy", "Q-Learn"]
runtime_ms = [42, 35, 18, 27, 15, 210]
save_bar_chart(
    "poster-bar-maze-runtime.png",
    "Maze Algorithms Runtime Comparison (Medium Grid)",
    maze_algos,
    runtime_ms,
    "Runtime (ms)",
    "#22c55e",
)

# 2) Maze explored cells count
explored_cells = [188, 172, 94, 126, 88, 140]
save_bar_chart(
    "poster-bar-maze-explored-cells.png",
    "Cells Explored by Maze Algorithms",
    maze_algos,
    explored_cells,
    "Explored Cells",
    "#3b82f6",
)

# 3) Maze path length comparison
path_steps = [28, 41, 28, 28, 33, 31]
save_bar_chart(
    "poster-bar-maze-path-steps.png",
    "Path Steps by Maze Algorithms",
    maze_algos,
    path_steps,
    "Path Steps",
    "#f59e0b",
)

# 4) Sudoku solve time by difficulty
difficulty = ["Easy", "Medium", "Hard"]
sudoku_time_s = [0.9, 2.1, 5.4]
save_bar_chart(
    "poster-bar-sudoku-solve-time.png",
    "Sudoku Solve Time by Difficulty",
    difficulty,
    sudoku_time_s,
    "Solve Time (s)",
    "#a855f7",
)

print("Generated charts:")
for p in sorted(OUT.glob("poster-bar-*.png")):
    print(p.name)
