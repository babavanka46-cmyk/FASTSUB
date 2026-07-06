from __future__ import annotations

from pathlib import Path
from typing import Any
from fastapi import APIRouter, File, HTTPException, UploadFile
from ..models import Project
from ..storage import create_project, get_project, list_projects, project_dir, save_project
from ..transcription import TranscriptionError, extract_audio

router = APIRouter(prefix="/api")

def _require_project(project_id: str) -> Project:
    try:
        return get_project(project_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project not found") from exc

@router.get("/projects", response_model=list[Project])
def projects() -> list[Project]:
    return list_projects()

@router.post("/projects/upload", response_model=Project)
async def upload_video(file: UploadFile = File(...)) -> Project:
    suffix = Path(file.filename or "source.mp4").suffix.lower() or ".mp4"
    ALLOWED_EXTENSIONS = {".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"}
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"ไม่รองรับประเภทไฟล์ {suffix} (รองรับเฉพาะ MP4, WebM, MOV, AVI, MKV)"
        )
    
    # Validate file size (Max 500MB)
    MAX_SIZE = 500 * 1024 * 1024
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > MAX_SIZE:
        raise HTTPException(status_code=400, detail="ขนาดไฟล์เกินขีดจำกัด 500MB")
        
    project = create_project(file.filename or "Untitled video", file.file, suffix)
    from ..transcription import create_video_proxy
    create_video_proxy(project.id, project.source_video)
    try:
        audio_path = extract_audio(project.id, project.source_video)
    except TranscriptionError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    if audio_path:
        project.audio_path = audio_path
        save_project(project)
    return project

@router.get("/project/{project_id}", response_model=Project)
def project(project_id: str) -> Project:
    return _require_project(project_id)

@router.post("/project/{project_id}/settings", response_model=Project)
def save_project_settings(project_id: str, settings: dict[str, Any]) -> Project:
    current = _require_project(project_id)
    current.settings = settings
    save_project(current)
    return current

@router.delete("/project/{project_id}")
def delete_project_endpoint(project_id: str) -> dict[str, str]:
    _require_project(project_id)
    try:
        import shutil
        folder = project_dir(project_id)
        if folder.exists():
            shutil.rmtree(folder)
        return {"message": "Project deleted successfully"}
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
