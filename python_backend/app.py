from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="AI Mini Project Python Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

frontend_dist = Path(__file__).resolve().parent.parent / "src" / "frontend" / "dist"
assets_dist = frontend_dist / "assets"

if assets_dist.exists():
    app.mount("/assets", StaticFiles(directory=assets_dist), name="assets")


@app.get("/api/do-nothing", status_code=204)
async def do_nothing():
    return JSONResponse(status_code=204, content=None)


@app.get("/api/health")
async def health_check():
    return {"status": "ok"}


@app.get("/")
async def root():
    index_path = frontend_dist / "index.html"
    if not index_path.exists():
        return HTMLResponse(
            "<h1>Frontend build missing</h1><p>Run `pnpm build` in src/frontend.</p>",
            status_code=500,
        )
    return FileResponse(index_path)


@app.get("/{full_path:path}")
async def spa_handler(full_path: str, request: Request):
    index_path = frontend_dist / "index.html"
    if not index_path.exists():
        return HTMLResponse(
            "<h1>Frontend build missing</h1><p>Run `pnpm build` in src/frontend.</p>",
            status_code=500,
        )

    requested_path = frontend_dist / full_path
    if requested_path.exists() and requested_path.is_file():
        return FileResponse(requested_path)

    return FileResponse(index_path)
