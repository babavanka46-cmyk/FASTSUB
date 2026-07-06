from __future__ import annotations

import json
import shutil
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import BinaryIO

from .models import Project, ProjectStatus, SubtitleDocument

BASE_DIR = Path(__file__).resolve().parents[1]
STORAGE_DIR = BASE_DIR / "storage"
PROJECTS_DIR = STORAGE_DIR / "projects"


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def repair_mojibake(text: str) -> str:
    if not text:
        return text
    try:
        b = text.encode("latin-1")
        decoded = b.decode("utf-8")
        if decoded != text and any(0x0E00 <= ord(c) <= 0x0E7F for c in decoded):
            return decoded
    except (UnicodeEncodeError, UnicodeDecodeError):
        pass
    return text


def ensure_storage() -> None:
    PROJECTS_DIR.mkdir(parents=True, exist_ok=True)


def project_dir(project_id: str) -> Path:
    ensure_storage()
    return PROJECTS_DIR / project_id


def create_project(name: str, file_obj: BinaryIO, suffix: str) -> Project:
    ensure_storage()
    name = repair_mojibake(name)
    project_id = uuid.uuid4().hex[:12]
    folder = project_dir(project_id)
    uploads = folder / "uploads"
    uploads.mkdir(parents=True, exist_ok=True)
    safe_suffix = suffix if suffix.startswith(".") else f".{suffix}"
    video_path = uploads / f"source{safe_suffix}"
    with video_path.open("wb") as target:
        shutil.copyfileobj(file_obj, target)

    now = utc_now()
    project = Project(
        id=project_id,
        name=name,
        source_video=str(video_path.relative_to(BASE_DIR)),
        created_at=now,
        updated_at=now,
    )
    save_project(project)
    save_subtitles(SubtitleDocument(project_id=project_id))
    return project


def project_meta_path(project_id: str) -> Path:
    return project_dir(project_id) / "project.json"


def subtitles_path(project_id: str) -> Path:
    return project_dir(project_id) / "subtitles.json"


def save_project(project: Project) -> None:
    folder = project_dir(project.id)
    folder.mkdir(parents=True, exist_ok=True)
    project.updated_at = utc_now()
    project_meta_path(project.id).write_text(project.model_dump_json(indent=2), encoding="utf-8")


def get_project(project_id: str) -> Project:
    path = project_meta_path(project_id)
    if not path.exists():
        raise FileNotFoundError(project_id)
    try:
        content = path.read_text(encoding="utf-8")
        data = json.loads(content)
        if "name" in data and isinstance(data["name"], str):
            data["name"] = repair_mojibake(data["name"])
        return Project.model_validate(data)
    except Exception as exc:
        raise ValueError(f"Corrupted project metadata for {project_id}: {exc}") from exc


def list_projects() -> list[Project]:
    ensure_storage()
    projects: list[Project] = []
    for meta in PROJECTS_DIR.glob("*/project.json"):
        try:
            content = meta.read_text(encoding="utf-8")
            data = json.loads(content)
            if "name" in data and isinstance(data["name"], str):
                repaired = repair_mojibake(data["name"])
                if repaired != data["name"]:
                    data["name"] = repaired
                    try:
                        meta.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
                    except Exception:
                        pass
            project = Project.model_validate(data)
            projects.append(project)
        except Exception as exc:
            import logging
            logging.error(f"Quarantining/skipping corrupt project config at {meta}: {exc}")
    return sorted(projects, key=lambda item: item.updated_at, reverse=True)


def save_subtitles(document: SubtitleDocument) -> SubtitleDocument:
    document.updated_at = utc_now()
    path = subtitles_path(document.project_id)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(document.model_dump_json(indent=2), encoding="utf-8")
    return document


def get_subtitles(project_id: str) -> SubtitleDocument:
    path = subtitles_path(project_id)
    if not path.exists():
        return save_subtitles(SubtitleDocument(project_id=project_id))
    return SubtitleDocument.model_validate_json(path.read_text(encoding="utf-8"))


def update_project_status(project_id: str, status: ProjectStatus, **extra: str | None) -> Project:
    project = get_project(project_id)
    project.status = status
    for key, value in extra.items():
        if value is not None:
            setattr(project, key, value)
    save_project(project)
    return project


def write_json(path: Path, payload: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def save_project_asset(project_id: str, folder_name: str, name: str, file_obj: BinaryIO, suffix: str) -> str:
    folder = project_dir(project_id) / folder_name
    folder.mkdir(parents=True, exist_ok=True)
    asset_id = uuid.uuid4().hex[:10]
    safe_suffix = suffix if suffix.startswith(".") else f".{suffix}"
    path = folder / f"{asset_id}-{Path(name).stem}{safe_suffix}"
    with path.open("wb") as target:
        shutil.copyfileobj(file_obj, target)
    return str(path.relative_to(BASE_DIR))
