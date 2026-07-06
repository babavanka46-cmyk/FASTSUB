from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .models import AutoCorrectRequest, Project, RenderResponse, RenderSettings, SubtitleDocument, SubtitleExportResponse, TranslateRequest
from .rendering import render_project
from .storage import BASE_DIR, STORAGE_DIR, create_project, get_project, get_subtitles, list_projects, save_project, save_project_asset, save_subtitles
from .subtitle_export import export_subtitle_file
from .transcription import TranscriptionError, extract_audio, preload_whisper_model, repair_thai_word_segments, transcribe_project, whisper_status

app = FastAPI(title="FASTSUB Local API", version="0.1.0")

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

STORAGE_DIR.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(BASE_DIR)), name="media")


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/whisper/status")
def get_whisper_status() -> dict[str, object]:
    return whisper_status()


@app.post("/api/whisper/preload")
def preload_whisper(
    model: str = Query("small"),
    device: str = Query("cpu"),
    compute_type: str = Query("int8"),
) -> dict[str, object]:
    try:
        return preload_whisper_model(model_size=model, device=device, compute_type=compute_type)
    except TranscriptionError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/api/projects", response_model=list[Project])
def projects() -> list[Project]:
    return list_projects()


@app.post("/api/projects/upload", response_model=Project)
async def upload_video(file: UploadFile = File(...)) -> Project:
    suffix = Path(file.filename or "source.mp4").suffix or ".mp4"
    project = create_project(file.filename or "Untitled video", file.file, suffix)
    try:
        audio_path = extract_audio(project.id, project.source_video)
    except TranscriptionError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc
    if audio_path:
        project.audio_path = audio_path
        save_project(project)
    return project


@app.get("/api/project/{project_id}", response_model=Project)
def project(project_id: str) -> Project:
    try:
        return get_project(project_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project not found") from exc


@app.get("/api/project/{project_id}/subtitles", response_model=SubtitleDocument)
def subtitles(project_id: str) -> SubtitleDocument:
    _require_project(project_id)
    return get_subtitles(project_id)


@app.post("/api/project/{project_id}/subtitles", response_model=SubtitleDocument)
def save_project_subtitles(project_id: str, document: SubtitleDocument) -> SubtitleDocument:
    _require_project(project_id)
    if document.project_id != project_id:
        document.project_id = project_id
    return save_subtitles(document)


@app.post("/api/project/{project_id}/transcribe", response_model=SubtitleDocument)
def transcribe(
    project_id: str,
    language: str = Query("th"),
    model: str = Query("small"),
    device: str = Query("cpu"),
    compute_type: str = Query("int8"),
    vad_filter: bool = Query(False),
) -> SubtitleDocument:
    current = _require_project(project_id)
    try:
        return transcribe_project(project_id, current.audio_path, language, model, device, compute_type, vad_filter)
    except TranscriptionError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/api/project/{project_id}/subtitles/repair-thai-words", response_model=SubtitleDocument)
def repair_project_thai_words(project_id: str) -> SubtitleDocument:
    _require_project(project_id)
    subtitles_document = get_subtitles(project_id)
    return repair_thai_word_segments(project_id, subtitles_document)


@app.post("/api/project/{project_id}/assets/bgm")
async def upload_bgm(project_id: str, file: UploadFile = File(...)) -> dict[str, str]:
    _require_project(project_id)
    suffix = Path(file.filename or "bgm.mp3").suffix or ".mp3"
    asset_path = save_project_asset(project_id, "bgm", file.filename or "bgm", file.file, suffix)
    url_path = asset_path.replace("\\", "/")
    return {"path": asset_path, "url": f"/media/{url_path}"}


@app.post("/api/project/{project_id}/render", response_model=RenderResponse)
def render(project_id: str, settings: RenderSettings) -> RenderResponse:
    current = _require_project(project_id)
    subtitles_document = get_subtitles(project_id)
    output_url, message = render_project(project_id, current.source_video, subtitles_document, settings)
    return RenderResponse(project_id=project_id, output_url=output_url, message=message)


@app.post("/api/project/{project_id}/subtitles/export", response_model=SubtitleExportResponse)
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


@app.delete("/api/project/{project_id}")
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


@app.post("/api/project/{project_id}/autocorrect", response_model=SubtitleDocument)
async def autocorrect(project_id: str, request: AutoCorrectRequest) -> SubtitleDocument:
    document = get_subtitles(project_id)
    if request.provider == "gemini" and request.api_key:
        corrected = await _correct_with_gemini(document, request.api_key)
        return save_subtitles(corrected)
    for segment in document.segments:
        segment.text = " ".join(word.text.strip() for word in segment.words) if segment.words else " ".join(segment.text.split())
    return save_subtitles(document)


@app.post("/api/project/{project_id}/translate", response_model=SubtitleDocument)
def translate(project_id: str, request: TranslateRequest) -> SubtitleDocument:
    document = get_subtitles(project_id)
    translated = document.model_copy(deep=True)
    translated.language = request.target_language
    for segment in translated.segments:
        segment.text = f"[{request.target_language}] {segment.text}"
    return translated


def _require_project(project_id: str) -> Project:
    try:
        return get_project(project_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project not found") from exc


async def _correct_with_gemini(document: SubtitleDocument, api_key: str) -> SubtitleDocument:
    import httpx

    prompt = (
        "Fix Thai spelling errors, adjust grammar, and correct word spacing. "
        "Strictly preserve JSON structure and all start/end timeline values. "
        "Return only valid JSON matching the input schema."
    )
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": f"{prompt}\n\n{document.model_dump_json()}"}],
            }
        ],
        "generationConfig": {"responseMimeType": "application/json"},
    }
    async with httpx.AsyncClient(timeout=45) as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
    text = response.json()["candidates"][0]["content"]["parts"][0]["text"]
    return SubtitleDocument.model_validate_json(text)
