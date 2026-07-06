from __future__ import annotations

import mimetypes
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .storage import STORAGE_DIR
from .routers.projects import router as projects_router
from .routers.transcription import router as transcription_router
from .routers.renders import router as renders_router

app = FastAPI(title="FASTSUB Local API", version="0.1.0")

mimetypes.add_type("font/ttf", ".ttf")
mimetypes.add_type("font/otf", ".otf")
mimetypes.add_type("font/woff", ".woff")
mimetypes.add_type("font/woff2", ".woff2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "chrome-extension://*",
    ],
    allow_origin_regex=r"chrome-extension://.*",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from fastapi import Header, HTTPException, status
from fastapi.responses import FileResponse, StreamingResponse
from pathlib import Path

STORAGE_DIR.mkdir(parents=True, exist_ok=True)

@app.get("/media/storage/{path:path}")
def stream_media(path: str, range: str | None = Header(None)):
    file_path = STORAGE_DIR / path
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")
        
    # Redirect to H.264 proxy version automatically for browser preview if it exists
    if file_path.name == "source.mp4" or file_path.suffix.lower() in {".mp4", ".mov", ".avi", ".webm", ".mkv"}:
        proxy_path = file_path.parent / "source_proxy.mp4"
        if proxy_path.exists():
            file_path = proxy_path
            
    file_size = file_path.stat().st_size
    
    if not range:
        return FileResponse(file_path)
        
    try:
        range_value = range.strip().lower().replace("bytes=", "")
        parts = range_value.split("-")
        start = int(parts[0]) if parts[0] else 0
        end = int(parts[1]) if parts[1] else file_size - 1
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid Range Header: {range}"
        ) from exc
        
    if start >= file_size or end >= file_size:
        return StreamingResponse(
            content=iter([]),
            status_code=status.HTTP_416_REQUESTED_RANGE_NOT_SATISFIABLE,
            headers={"Content-Range": f"bytes */{file_size}"}
        )
        
    chunk_size = (end - start) + 1
    
    def file_iterator():
        with open(file_path, "rb") as f:
            f.seek(start)
            remaining = chunk_size
            while remaining > 0:
                chunk = f.read(min(remaining, 8192 * 16))
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk

    content_type, _ = mimetypes.guess_type(str(file_path))
    if not content_type:
        content_type = "application/octet-stream"

    headers = {
        "Content-Range": f"bytes {start}-{end}/{file_size}",
        "Accept-Ranges": "bytes",
        "Content-Length": str(chunk_size),
        "Content-Type": content_type,
    }
    
    return StreamingResponse(
        file_iterator(),
        status_code=status.HTTP_206_PARTIAL_CONTENT,
        headers=headers
    )

app.mount("/media/storage", StaticFiles(directory=str(STORAGE_DIR)), name="media")

@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}

app.include_router(projects_router)
app.include_router(transcription_router)
app.include_router(renders_router)
