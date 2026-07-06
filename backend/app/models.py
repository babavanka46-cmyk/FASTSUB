from __future__ import annotations

from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class Word(BaseModel):
    id: str
    text: str
    start: float
    end: float


class SubtitleSegment(BaseModel):
    id: str
    start: float
    end: float
    text: str
    words: list[Word] = Field(default_factory=list)


class SubtitleDocument(BaseModel):
    project_id: str
    language: str = "th"
    words_per_line: int = 3
    segments: list[SubtitleSegment] = Field(default_factory=list)
    updated_at: str | None = None


class ProjectStatus(str, Enum):
    uploaded = "uploaded"
    transcribed = "transcribed"
    rendering = "rendering"
    rendered = "rendered"
    failed = "failed"


class Project(BaseModel):
    id: str
    name: str
    status: ProjectStatus = ProjectStatus.uploaded
    source_video: str
    audio_path: str | None = None
    rendered_video: str | None = None
    created_at: str
    updated_at: str
    settings: dict[str, Any] = Field(default_factory=dict)


class StyleSettings(BaseModel):
    preset: str = "neon"
    animation: str = "pop"
    font_family: str = "Noto Sans Thai"
    font_size: int = 64
    font_weight: int = 800
    vertical_offset: int = 78
    text_color: str = "#ffffff"
    active_color: str = "#38f8b8"
    shadow_color: str = "#000000"


class AudioSettings(BaseModel):
    bgm_path: str | None = None
    bgm_volume: float = 0.18
    bgm_loop: bool = True
    sfx_name: str | None = None
    sfx_density: float = 0.2
    sfx_volume: float = 0.35


class RenderSettings(BaseModel):
    resolution: Literal["720p", "1080p", "1440p"] = "1080p"
    fps: int = 30
    subtitle_type: Literal["hard", "soft"] = "hard"
    style: StyleSettings = Field(default_factory=StyleSettings)
    audio: AudioSettings = Field(default_factory=AudioSettings)


class RenderResponse(BaseModel):
    project_id: str
    output_url: str | None
    message: str


class SubtitleExportResponse(BaseModel):
    project_id: str
    format: Literal["srt", "vtt", "ass", "txt"]
    output_url: str
    message: str


class AutoCorrectRequest(BaseModel):
    api_key: str | None = None
    provider: Literal["gemini", "local"] = "local"


class TranslateRequest(BaseModel):
    target_language: str
