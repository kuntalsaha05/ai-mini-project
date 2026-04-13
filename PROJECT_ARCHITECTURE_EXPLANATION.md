# Project Backend and Frontend Explanation

## Overview

This project is an interactive algorithm visualizer called **AI Solve Lab**. It lets users:

- solve and visualize Sudoku puzzles
- generate and solve mazes with multiple algorithms
- compare search algorithms such as BFS and A*
- view learning content about the algorithms
- store solve statistics in the browser

The project has two main parts:

1. **Frontend**: a React + TypeScript application in `src/frontend`
2. **Backend**: a small FastAPI server in `python_backend`

The important architectural detail is that **almost all business logic lives in the frontend**. The Python backend mainly serves the built frontend files and exposes a basic health API.

There is also an older Internet Computer / Motoko backend in `src/backend`, but based on the current README and Python server setup, it is **not the active backend used for hosting this version**.

---

## Backend Explanation

### Location

- `python_backend/app.py`

### Technology

- Python
- FastAPI
- Uvicorn for running the app

### Purpose of the backend

The backend is a **lightweight web server** whose main job is to host the built frontend files from `src/frontend/dist`.

It does not contain the Sudoku solving logic, maze solving logic, statistics processing, or UI logic. Those are all handled in the browser by the frontend.

### What `app.py` does

The FastAPI application performs these tasks:

#### 1. Creates the API server

It initializes a FastAPI app:

- app title: `AI Mini Project Python Server`

#### 2. Enables CORS

The app allows:

- all origins
- `GET`, `POST`, and `OPTIONS`
- all headers

This is useful during development or if the frontend and backend are served from different origins.

#### 3. Serves static frontend assets

It computes:

- `frontend_dist = ../src/frontend/dist`
- `assets_dist = ../src/frontend/dist/assets`

If the build output exists, it mounts `/assets` so JavaScript, CSS, and bundled assets can be served correctly.

#### 4. Exposes small API endpoints

The backend currently provides:

- `GET /api/health`
  - returns `{ "status": "ok" }`
  - useful for checking whether the backend is running

- `GET /api/do-nothing`
  - returns HTTP `204 No Content`
  - appears to be a placeholder endpoint

#### 5. Serves the React app

- `GET /`
  - returns `dist/index.html`

- `GET /{full_path:path}`
  - acts as an SPA fallback
  - if a requested file exists in the build folder, it serves that file
  - otherwise it returns `index.html`

This is the standard setup for a single-page application, where routes are handled on the frontend.

### Error handling behavior

If the frontend has not been built yet, the backend returns an HTML error message telling the user to run:

- `pnpm build` inside `src/frontend`

### Backend summary

The backend is intentionally simple:

- it is a **static file host**
- it includes **basic health endpoints**
- it supports **client-side routing**
- it does **not** contain the core algorithm engine

---

## Frontend Explanation

### Location

- `src/frontend`

### Technology

- React 19
- TypeScript
- Vite
- Tailwind CSS
- Motion for animation
- `next-themes` for theme switching
- `@tanstack/react-query` for app-level query support
- Recharts for charts
- `sonner` for toast notifications

### Frontend entry point

#### `src/frontend/src/main.tsx`

This file starts the React app and wraps it with:

- `QueryClientProvider`
- `InternetIdentityProvider`

It also adds a custom `BigInt.prototype.toJSON` helper so `BigInt` values can be serialized safely.

#### `src/frontend/src/App.tsx`

This is the main application shell. It is responsible for:

- theme setup with `ThemeProvider`
- top navigation bar
- hero section
- tab-based navigation between major app areas
- modal integration for save/load/export
- toast notifications

The main tabs are:

- `Solvers`
- `Statistics`
- `Learn`

---

## Main Frontend Features

### 1. Sudoku Solver

#### Main file

- `src/frontend/src/components/SudokuSolver.tsx`

#### Responsibility

This component is one of the most important pieces of the project. It contains:

- Sudoku board rendering
- user input handling
- puzzle presets
- random puzzle generation
- hinting
- solve animation
- image-based puzzle extraction
- scoring and timing
- saving/loading/share helpers
- statistics logging

#### Main logic inside the component

The Sudoku solver is implemented directly inside the component file through helper functions such as:

- `isValid(...)`
- `collectSolveSteps(...)`
- `collectConstraintSteps(...)`
- `generateSolvedGrid()`
- `generatePuzzle(...)`
- `extractGridFromImage(...)`

#### Supported solving styles

The UI lets the user choose between:

- **Backtracking**
- **Constraint + Backtracking**

The component collects step-by-step solve actions and then animates them in the UI. This makes the app educational, not just functional.

#### Extra frontend-only features

The Sudoku component also includes:

- timer tracking
- mistake counting
- hint counting
- score calculation
- URL sharing through an encoded puzzle state
- browser file upload for image-based puzzle reading

This shows that the frontend is doing far more than presentation. It is also acting as the algorithm engine and interaction manager.

---

### 2. Maze Solver

#### Main file

- `src/frontend/src/components/MazeSolver.tsx`

#### Responsibility

This component handles:

- maze generation
- maze rendering on a `<canvas>`
- pathfinding algorithm execution
- frame-by-frame playback
- algorithm comparison through status and metrics
- solve statistics collection

#### Maze generation

The component supports two maze generators:

- recursive backtracking / DFS-style carving
- Prim-based generation

#### Search algorithms included

The maze solver supports:

- BFS
- DFS
- A*
- Greedy Best-First Search
- Q-Learning based search

#### How it works

The component:

1. generates a maze grid in memory
2. runs the selected search algorithm
3. stores the visited order and final path
4. converts those into animation frames
5. replays the frames on a canvas

This is a frontend-heavy architecture because all pathfinding computation happens in the browser.

#### Performance and tracking

When an algorithm runs, the component records a stat entry using `addStat(...)`, including:

- algorithm name
- maze size
- duration
- number of explored nodes
- step count
- success or failure

---

### 3. Maze Comparison

#### Main file

- `src/frontend/src/components/MazeComparison2.tsx`

#### Responsibility

This feature compares **BFS** and **A*** on the same generated maze.

It:

- generates a maze
- runs both algorithms asynchronously
- animates both searches
- reports explored steps and path lengths

This section supports the educational goal of the project by showing how heuristic search differs from uninformed search.

---

### 4. Statistics Dashboard

#### Main file

- `src/frontend/src/components/StatisticsDashboard.tsx`

#### Responsibility

This component reads locally stored solve records and visualizes them.

It shows:

- total solve count
- average duration
- overall success rate
- per-algorithm average performance
- tabular history summaries

Charts are rendered using **Recharts**.

#### Data source

Statistics come from browser storage through:

- `src/frontend/src/utils/statistics.ts`

No backend database is used for this part.

---

### 5. Educational Panel

#### Main file

- `src/frontend/src/components/EducationalPanel.tsx`

#### Responsibility

This component explains algorithms with:

- descriptions
- time complexity
- space complexity
- pseudocode
- pros and cons

It turns the app from just a visualizer into a learning tool.

---

### 6. Save / Load / Export Modal

#### Main file

- `src/frontend/src/components/SaveLoadExportModal.tsx`

#### Responsibility

This modal provides utility actions such as:

- exporting statistics to JSON
- importing statistics from JSON
- a placeholder save-puzzle action

The data is stored in `localStorage`, not on the server.

---

## Frontend Utility Layer

### `src/frontend/src/utils/statistics.ts`

This file manages statistics persistence in `localStorage`.

It defines:

- the solve statistics data shape
- helper functions to load and save stats
- success rate and average time calculations

Storage key used:

- `ai-solve-lab`

### `src/frontend/src/utils/mazeAlgorithms.ts`

This contains a `MazeSolver` class for maze creation logic. In the current app, the main interactive maze solver component already contains its own maze generation and search logic, so this utility appears to be more of a supporting or earlier abstraction than the primary runtime path.

### `src/frontend/src/utils/StorageClient.ts`

This is a much more advanced storage helper related to ICP-style blob upload and certificate flow. It includes:

- chunked upload logic
- hash tree generation
- retry logic
- storage gateway integration

However, this logic is not part of the simple Python-hosted flow described in the project README. It looks like leftover or optional infrastructure from the original Internet Computer based project architecture.

---

## Data Flow Between Backend and Frontend

### Current active flow

The current deployed/runtime idea is:

1. the frontend is built with Vite into static files
2. FastAPI serves those files
3. the user opens the app in the browser
4. all Sudoku and maze computation runs in the frontend
5. user statistics are stored in browser local storage

So the interaction is mostly:

- **Backend -> serves files**
- **Frontend -> handles logic, rendering, storage, and animation**

### What the backend does not currently do

The active Python backend does not:

- solve Sudoku
- generate mazes
- run pathfinding algorithms
- save statistics to a database
- manage user accounts
- persist puzzles on the server

---

## Role of the Older Motoko Backend

### Location

- `src/backend/main.mo`

The repository still contains an older backend from the original platform setup. The root README explicitly says:

- the original Motoko backend is not used by the Python server

That means for the current version of this project:

- the **Python backend is the active host**
- the **React frontend is the active application**
- the **Motoko backend is legacy or unused for this flow**

---

## Architectural Assessment

### Strengths

- simple deployment model
- backend is easy to run and understand
- frontend is rich and interactive
- algorithms are visualized step by step
- local storage avoids needing a database
- educational content is integrated into the product

### Limitations

- the backend is very thin and does not add much application logic
- most logic is concentrated inside large frontend component files
- statistics are local to one browser unless exported/imported manually
- some project files suggest older architecture pieces that are no longer part of the active runtime
- a few features are incomplete, such as the puzzle export placeholder

---

## In Short

### Backend

The backend is a **FastAPI static host**. It serves the built React app, exposes a health endpoint, and supports SPA routing.

### Frontend

The frontend is the **real application core**. It contains:

- Sudoku solving logic
- maze generation and pathfinding logic
- animations
- user interaction logic
- educational content
- local statistics storage

### Overall design

This project is best understood as a **frontend-first algorithm visualization app with a lightweight Python delivery server**.
