# AI Mini Project

This repository contains a React frontend exported from Caffeine and a new Python server that can host the built frontend as a static app.

## What was converted

- Added a Python backend server in `python_backend/app.py`
- Added Python dependency management in `python_backend/requirements.txt`
- Added instructions for running the Python-hosted app in `python_backend/README.md`

## Running the Python version

1. Build the frontend:
   ```bash
   cd src/frontend
   pnpm install
   pnpm build
   ```

2. Run the Python server:
   ```bash
   cd python_backend
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn app:app --reload --host 0.0.0.0 --port 8000
   ```

3. Open the app:
   ```text
   http://localhost:8000
   ```

## Notes

- The original Motoko backend (`src/backend/main.mo`) is not used by the Python server.
- The frontend remains a React app and is served as static files from the Python backend.
