from __future__ import annotations

import os
import re
import subprocess
import uuid
from pathlib import Path

from .models import ProjectStatus, SubtitleDocument, SubtitleSegment, Word
from .storage import BASE_DIR, project_dir, save_subtitles, update_project_status

DEFAULT_MODEL = os.getenv("FASTSUB_WHISPER_MODEL", "small")
DEFAULT_DEVICE = os.getenv("FASTSUB_WHISPER_DEVICE", "cpu")
DEFAULT_COMPUTE_TYPE = os.getenv("FASTSUB_WHISPER_COMPUTE_TYPE", "int8")

_MODEL_CACHE = {}


class TranscriptionError(RuntimeError):
    pass


def extract_audio(project_id: str, source_video: str) -> str | None:
    output = project_dir(project_id) / "audio" / "source.wav"
    output.parent.mkdir(parents=True, exist_ok=True)
    source_path = BASE_DIR / source_video
    command = [
        "ffmpeg",
        "-y",
        "-i",
        str(source_path),
        "-vn",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "16000",
        "-ac",
        "1",
        str(output),
    ]
    try:
        subprocess.run(command, check=True, capture_output=True, text=True)
    except FileNotFoundError as exc:
        raise TranscriptionError("FFmpeg was not found on PATH. Install FFmpeg before uploading/transcribing videos.") from exc
    except subprocess.CalledProcessError as exc:
        stderr = exc.stderr or ""
        no_audio_markers = (
            "Output file does not contain any stream",
            "matches no streams",
            "Stream map",
            "does not contain any stream",
        )
        if any(marker in stderr for marker in no_audio_markers):
            if output.exists():
                output.unlink()
            return None
        detail = stderr[-1200:] if stderr else "FFmpeg failed to extract audio from this video."
        raise TranscriptionError(detail) from exc
    return str(output.relative_to(BASE_DIR))


def whisper_status() -> dict[str, object]:
    installed = _is_faster_whisper_installed()
    return {
        "installed": installed,
        "default_model": DEFAULT_MODEL,
        "default_device": DEFAULT_DEVICE,
        "default_compute_type": DEFAULT_COMPUTE_TYPE,
        "loaded_models": list(_MODEL_CACHE.keys()),
    }


def preload_whisper_model(
    model_size: str = DEFAULT_MODEL,
    device: str = DEFAULT_DEVICE,
    compute_type: str = DEFAULT_COMPUTE_TYPE,
) -> dict[str, object]:
    _get_model(model_size=model_size, device=device, compute_type=compute_type)
    return whisper_status()


def transcribe_project(
    project_id: str,
    audio_path: str | None,
    language: str = "th",
    model_size: str = DEFAULT_MODEL,
    device: str = DEFAULT_DEVICE,
    compute_type: str = DEFAULT_COMPUTE_TYPE,
    vad_filter: bool = False,
) -> SubtitleDocument:
    if not audio_path:
        raise TranscriptionError("This project has no extracted audio. Upload a valid video or re-upload after confirming FFmpeg is installed.")

    audio_file = BASE_DIR / audio_path
    if not audio_file.exists():
        raise TranscriptionError(f"Audio file not found: {audio_path}")

    return _transcribe_with_faster_whisper(project_id, audio_file, language, model_size, device, compute_type, vad_filter)


def _is_faster_whisper_installed() -> bool:
    try:
        import faster_whisper  # noqa: F401
    except Exception:
        return False
    return True


def _get_model(model_size: str, device: str, compute_type: str):
    from faster_whisper import WhisperModel

    cache_key = (model_size, device, compute_type)
    if cache_key not in _MODEL_CACHE:
        try:
            _MODEL_CACHE[cache_key] = WhisperModel(model_size, device=device, compute_type=compute_type)
        except Exception as exc:
            raise TranscriptionError(
                "Could not load faster-whisper model. "
                "Check internet access for the first model download, disk space, and the selected device/compute type. "
                f"Original error: {exc}"
            ) from exc
    return _MODEL_CACHE[cache_key]


def _transcribe_with_faster_whisper(
    project_id: str,
    audio_file: Path,
    language: str,
    model_size: str,
    device: str,
    compute_type: str,
    vad_filter: bool,
) -> SubtitleDocument:
    model = _get_model(model_size=model_size, device=device, compute_type=compute_type)
    segments_iter, _ = model.transcribe(
        str(audio_file),
        language=language or None,
        word_timestamps=True,
        vad_filter=vad_filter,
        beam_size=5,
        condition_on_previous_text=False,
    )
    segments: list[SubtitleSegment] = []
    for idx, segment in enumerate(segments_iter):
        segment_text = _normalize_transcript_text(segment.text)
        words: list[Word] = []
        for word in segment.words or []:
            words.append(
                Word(
                    id=uuid.uuid4().hex[:10],
                    text=_normalize_transcript_text(word.word),
                    start=float(word.start),
                    end=float(word.end),
                )
            )
        if _is_thai_language(language) and segment_text:
            words = _thai_segment_words(segment_text, float(segment.start), float(segment.end))
        if not words and segment_text:
            words = _fallback_words(segment_text, float(segment.start), float(segment.end))
        segments.append(
            SubtitleSegment(
                id=f"seg-{idx + 1}",
                start=float(segment.start),
                end=float(segment.end),
                text=_join_words_for_language(words, language) if words else segment_text,
                words=words,
            )
        )
    document = save_subtitles(SubtitleDocument(project_id=project_id, language=language, segments=segments))
    update_project_status(project_id, ProjectStatus.transcribed)
    return document


def repair_thai_word_segments(project_id: str, subtitles: SubtitleDocument) -> SubtitleDocument:
    repaired = subtitles.model_copy(deep=True)
    repaired.language = repaired.language or "th"
    for segment in repaired.segments:
        if _is_thai_language(repaired.language) and segment.text.strip():
            segment.text = _normalize_transcript_text(segment.text)
            segment.words = _thai_segment_words(segment.text, segment.start, segment.end)
            segment.text = _join_words_for_language(segment.words, repaired.language)
    return save_subtitles(repaired)


def _is_thai_language(language: str | None) -> bool:
    return (language or "").lower().startswith("th")


def _thai_segment_words(text: str, start: float, end: float) -> list[Word]:
    text = _normalize_transcript_text(text)
    try:
        from pythainlp.tokenize import word_tokenize

        tokens = word_tokenize(text, engine="newmm", keep_whitespace=False)
    except Exception:
        tokens = text.split()
    cleaned = [token.strip() for token in tokens if token and token.strip()]
    if not cleaned:
        return []
    duration = max(0.01, end - start)
    weights = [max(1, len(token)) for token in cleaned]
    total_weight = sum(weights)
    cursor = start
    words: list[Word] = []
    for index, token in enumerate(cleaned):
        if index == len(cleaned) - 1:
            token_end = end
        else:
            token_end = cursor + duration * (weights[index] / total_weight)
        words.append(
            Word(
                id=uuid.uuid4().hex[:10],
                text=token,
                start=float(cursor),
                end=float(max(cursor + 0.01, token_end)),
            )
        )
        cursor = token_end
    return words


def _normalize_transcript_text(text: str) -> str:
    normalized = re.sub(r"\s+", " ", str(text or "")).strip()
    previous = None
    while normalized != previous:
        previous = normalized
        normalized = re.sub(r"([\u0E00-\u0E7F])\s+([\u0E00-\u0E7F])", r"\1\2", normalized)
        normalized = re.sub(r"\b([A-Za-z])\s+(?=[A-Za-z]\b)", r"\1", normalized)
    return normalized


def _join_words_for_language(words: list[Word], language: str | None) -> str:
    parts = [word.text.strip() for word in words if word.text and word.text.strip()]
    if _is_thai_language(language):
        return "".join(parts)
    return " ".join(parts)


def _fallback_words(text: str, start: float, end: float) -> list[Word]:
    tokens = [token for token in text.split() if token]
    if not tokens:
        return []
    duration = max(0.01, end - start)
    step = duration / len(tokens)
    return [
        Word(
            id=uuid.uuid4().hex[:10],
            text=token,
            start=start + index * step,
            end=start + (index + 1) * step,
        )
        for index, token in enumerate(tokens)
    ]


def check_video_codec(video_path: Path) -> str:
    command = [
        "ffprobe",
        "-v", "error",
        "-select_streams", "v:0",
        "-show_entries", "stream=codec_name",
        "-of", "default=noprint_wrappers=1:nokey=1",
        str(video_path)
    ]
    try:
        res = subprocess.run(command, check=True, capture_output=True, text=True)
        return res.stdout.strip().lower()
    except Exception:
        return "h264"


def create_video_proxy(project_id: str, source_video_rel: str) -> bool:
    source_path = BASE_DIR / source_video_rel
    if not source_path.exists():
        return False
        
    codec = check_video_codec(source_path)
    file_size_mb = source_path.stat().st_size / (1024 * 1024)
    needs_proxy = codec in {"hevc", "h265", "prores"} or file_size_mb > 50.0
    
    if not needs_proxy:
        return False
        
    proxy_output = source_path.parent / "source_proxy.mp4"
    if proxy_output.exists():
        return True
        
    command = [
        "ffmpeg",
        "-y",
        "-i", str(source_path),
        "-vcodec", "libx264",
        "-preset", "veryfast",
        "-crf", "28",
        "-vf", "scale=-2:720",
        "-acodec", "aac",
        "-ar", "44100",
        "-ac", "2",
        str(proxy_output)
    ]
    try:
        subprocess.run(command, check=True, capture_output=True)
        return True
    except Exception:
        if proxy_output.exists():
            proxy_output.unlink()
        return False
