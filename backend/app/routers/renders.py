from __future__ import annotations

from pathlib import Path
from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from ..models import Project, RenderResponse, RenderSettings, SubtitleExportResponse
from ..rendering import render_project
from ..storage import get_project, get_subtitles, save_project_asset
from ..subtitle_export import export_subtitle_file

router = APIRouter(prefix="/api")

def _require_project(project_id: str) -> Project:
    try:
        return get_project(project_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project not found") from exc

@router.post("/project/{project_id}/assets/bgm")
async def upload_bgm(project_id: str, file: UploadFile = File(...)) -> dict[str, str]:
    _require_project(project_id)
    suffix = Path(file.filename or "bgm.mp3").suffix or ".mp3"
    asset_path = save_project_asset(project_id, "bgm", file.filename or "bgm", file.file, suffix)
    url_path = asset_path.replace("\\", "/")
    return {"path": asset_path, "url": f"/media/{url_path}"}

@router.post("/project/{project_id}/render", response_model=RenderResponse)
def render(project_id: str, settings: RenderSettings) -> RenderResponse:
    current = _require_project(project_id)
    subtitles_document = get_subtitles(project_id)
    output_url, message = render_project(project_id, current.source_video, subtitles_document, settings)
    return RenderResponse(project_id=project_id, output_url=output_url, message=message)

@router.post("/project/{project_id}/subtitles/export", response_model=SubtitleExportResponse)
def export_project_subtitles(
    project_id: str,
    output_format: str = Query("srt", pattern="^(srt|vtt|ass|txt)$"),
) -> SubtitleExportResponse:
    _require_project(project_id)
    subtitles_document = get_subtitles(project_id)
    path, output_url = export_subtitle_file(project_id, subtitles_document, output_format)  # type: ignore[arg-type]
    return SubtitleExportResponse(
        project_id=project_id,
        format=output_format,  # type: ignore[arg-type]
        output_url=output_url,
        message=f"Exported subtitles to {path.name}.",
    )
