# Python Backend for AI Mini Project

This folder contains a Python server that can host the built frontend as a static single-page app.

## Setup

1. Build the frontend:
   ```bash
   cd src/frontend
   pnpm install
   pnpm build
   ```

2. Create and activate a Python virtual environment:
   ```bash
   cd ../../python_backend
   python -m venv .venv
   .venv\Scripts\activate
   ```

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the server:
   ```bash
   uvicorn app:app --reload --host 0.0.0.0 --port 8000
   ```

5. Open the app in your browser:
   ```text
   http://localhost:8000
   ```
