from __future__ import annotations

from typing import Any
from fastapi import APIRouter, HTTPException, Query
from ..models import AutoCorrectRequest, Project, SubtitleDocument, TranslateRequest
from ..storage import get_project, get_subtitles, save_subtitles
from ..transcription import TranscriptionError, preload_whisper_model, repair_thai_word_segments, transcribe_project, whisper_status

router = APIRouter(prefix="/api")

def _require_project(project_id: str) -> Project:
    try:
        return get_project(project_id)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Project not found") from exc

def validate_subtitle_document(document: SubtitleDocument) -> None:
    for segment in document.segments:
        if segment.start < 0 or segment.end < 0:
            raise HTTPException(status_code=400, detail="เวลาเริ่มต้นและสิ้นสุดของเซกเมนต์ต้องไม่ติดลบ")
        if segment.start > segment.end:
            raise HTTPException(status_code=400, detail=f"เวลาเริ่มต้น ({segment.start}) ต้องไม่มากกว่าเวลาสิ้นสุด ({segment.end}) ในเซกเมนต์ {segment.id}")
        
        for w in segment.words:
            if w.start < 0 or w.end < 0:
                raise HTTPException(status_code=400, detail="เวลาของคำสะกดต้องไม่ติดลบ")
            if w.start > w.end:
                raise HTTPException(status_code=400, detail=f"เวลาเริ่มต้น ({w.start}) ต้องไม่มากกว่าเวลาสิ้นสุด ({w.end}) ในคำ '{w.text}'")

async def _correct_with_gemini(document: SubtitleDocument, api_key: str) -> SubtitleDocument:
    import httpx
    from pydantic import ValidationError

    prompt = (
        "Fix Thai spelling errors, adjust grammar, and correct word spacing. "
        "You must strictly preserve the JSON structure and all start/end timeline values. "
        "Return only valid JSON matching the input schema exactly. Do not wrap in markdown backticks."
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
    
    try:
        async with httpx.AsyncClient(timeout=45) as client:
            response = await client.post(url, json=payload)
            if response.status_code == 400:
                try:
                    err_json = response.json()
                except:
                    err_json = {}
                msg = err_json.get("error", {}).get("message", "Invalid Request")
                raise HTTPException(status_code=400, detail=f"คำขอไม่ถูกต้อง (400 Bad Request): {msg}")
            elif response.status_code == 403:
                raise HTTPException(status_code=403, detail="สิทธิ์เข้าถึงถูกปฏิเสธ (403 Forbidden): กรุณาตรวจสอบว่า API Key ถูกต้อง และเปิดใช้งาน Gemini API ใน Google AI Studio แล้ว")
            elif response.status_code == 429:
                raise HTTPException(status_code=429, detail="โควตาคำขอเต็มขีดจำกัด (429 Rate Limit): กรุณารอสักครู่แล้วลองอีกครั้ง")
            response.raise_for_status()
    except httpx.HTTPStatusError as exc:
        try:
            err_json = exc.response.json()
            msg = err_json.get("error", {}).get("message", exc.response.text)
        except:
            msg = exc.response.text
        raise HTTPException(status_code=500, detail=f"Gemini API ส่งคืนข้อผิดพลาด: {msg}") from exc
    except httpx.RequestError as exc:
        raise HTTPException(status_code=503, detail=f"ไม่สามารถเชื่อมต่ออินเทอร์เน็ตไปยัง Gemini API ได้: {exc}") from exc
    
    try:
        res_data = response.json()
        if "candidates" not in res_data or not res_data["candidates"]:
            if "error" in res_data:
                err_msg = res_data["error"].get("message", "Unknown error")
                raise HTTPException(status_code=400, detail=f"Gemini API Error: {err_msg}")
            raise HTTPException(status_code=400, detail="Gemini API ตรวจพบปัญหาและปฏิเสธการตอบกลับ (เช่น ความปลอดภัย/Safety Filter)")
        
        candidate = res_data["candidates"][0]
        finish_reason = candidate.get("finishReason", "")
        if finish_reason and finish_reason not in ("STOP", "MAX_TOKENS"):
            raise HTTPException(status_code=400, detail=f"Gemini ทำงานไม่เสร็จสิ้นเนื่องจากสาเหตุ: {finish_reason}")
            
        parts = candidate.get("content", {}).get("parts", [])
        if not parts or "text" not in parts[0]:
            raise HTTPException(status_code=400, detail="รูปแบบการตอบสนองของ Gemini ไม่ถูกต้อง (ไม่มีฟิลด์ text)")
            
        text = parts[0]["text"].strip()
        
        # Sanitize markdown code blocks if model ignored instructions
        if text.startswith("```"):
            lines = text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            text = "\n".join(lines).strip()
            
        return SubtitleDocument.model_validate_json(text)
    except ValidationError as exc:
        import logging
        logging.error(f"Gemini returned invalid JSON structure: {text}")
        raise HTTPException(
            status_code=422,
            detail="โมเดล Gemini ส่งคืนโครงสร้างข้อมูลที่ผิดเพี้ยนไปจากรูปแบบดั้งเดิม (กรุณาลองกดส่งใหม่อีกครั้ง)"
        ) from exc
    except Exception as exc:
        if isinstance(exc, HTTPException):
            raise exc
        raise HTTPException(status_code=500, detail=f"เกิดข้อผิดพลาดในการประมวลผลคำตอบ: {str(exc)}") from exc

@router.get("/whisper/status")
def get_whisper_status() -> dict[str, object]:
    return whisper_status()

@router.post("/whisper/preload")
def preload_whisper(
    model: str = Query("small"),
    device: str = Query("cpu"),
    compute_type: str = Query("int8"),
) -> dict[str, object]:
    try:
        return preload_whisper_model(model_size=model, device=device, compute_type=compute_type)
    except TranscriptionError as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

@router.get("/project/{project_id}/subtitles", response_model=SubtitleDocument)
def subtitles(project_id: str) -> SubtitleDocument:
    _require_project(project_id)
    return get_subtitles(project_id)

@router.post("/project/{project_id}/subtitles", response_model=SubtitleDocument)
def save_project_subtitles(project_id: str, document: SubtitleDocument) -> SubtitleDocument:
    _require_project(project_id)
    validate_subtitle_document(document)
    if document.project_id != project_id:
        document.project_id = project_id
    return save_subtitles(document)

@router.post("/project/{project_id}/transcribe", response_model=SubtitleDocument)
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

@router.post("/project/{project_id}/subtitles/repair-thai-words", response_model=SubtitleDocument)
def repair_project_thai_words(project_id: str) -> SubtitleDocument:
    _require_project(project_id)
    subtitles_document = get_subtitles(project_id)
    return repair_thai_word_segments(project_id, subtitles_document)

@router.post("/project/{project_id}/autocorrect", response_model=SubtitleDocument)
async def autocorrect(project_id: str, request: AutoCorrectRequest) -> SubtitleDocument:
    _require_project(project_id)
    document = get_subtitles(project_id)
    if request.provider == "gemini":
        if not request.api_key or not request.api_key.strip():
            raise HTTPException(status_code=400, detail="กรุณากรอก Gemini API Key สำหรับการตรวจสะกดคำด้วย AI")
        corrected = await _correct_with_gemini(document, request.api_key)
        return save_subtitles(corrected)
    for segment in document.segments:
        segment.text = " ".join(word.text.strip() for word in segment.words) if segment.words else " ".join(segment.text.split())
    return save_subtitles(document)

@router.post("/project/{project_id}/translate", response_model=SubtitleDocument)
def translate(project_id: str, request: TranslateRequest) -> SubtitleDocument:
    _require_project(project_id)
    raise HTTPException(status_code=501, detail="Translation is not implemented yet.")
