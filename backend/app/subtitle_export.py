from __future__ import annotations

from pathlib import Path
from typing import Literal

from .models import RenderSettings, SubtitleDocument
from .storage import BASE_DIR, project_dir

SubtitleFormat = Literal["srt", "vtt", "ass", "txt"]


def export_subtitle_file(
    project_id: str,
    subtitles: SubtitleDocument,
    output_format: SubtitleFormat,
    settings: RenderSettings | None = None,
) -> tuple[Path, str]:
    export_dir = project_dir(project_id) / "exports"
    export_dir.mkdir(parents=True, exist_ok=True)
    
    from .storage import get_project
    import re
    project = get_project(project_id)
    safe_name = re.sub(r'[\\/*?:"<>|]', "", Path(project.name).stem) or "subtitles"
    output = export_dir / f"{safe_name}.{output_format}"
    
    if output_format == "srt":
        output.write_text(to_srt(subtitles), encoding="utf-8")
    elif output_format == "vtt":
        output.write_text(to_vtt(subtitles), encoding="utf-8")
    elif output_format == "ass":
        from .rendering import write_ass_subtitles
        write_ass_subtitles(output, subtitles, settings or RenderSettings())
    elif output_format == "txt":
        output.write_text(to_txt(subtitles), encoding="utf-8")
    else:
        raise ValueError(f"Unsupported subtitle format: {output_format}")
    return output, f"/media/{output.relative_to(BASE_DIR).as_posix()}"


def to_srt(subtitles: SubtitleDocument) -> str:
    blocks = []
    words_per_line = max(1, subtitles.words_per_line)
    index = 1
    for segment in subtitles.segments:
        if segment.words:
            words = segment.words
            for i in range(0, len(words), words_per_line):
                chunk = words[i : i + words_per_line]
                chunk_start = chunk[0].start
                chunk_end = chunk[-1].end
                text = " ".join(w.text for w in chunk)
                blocks.append(
                    "\n".join(
                        [
                            str(index),
                            f"{_srt_time(chunk_start)} --> {_srt_time(chunk_end)}",
                            _segment_text(text),
                        ]
                    )
                )
                index += 1
        else:
            blocks.append(
                "\n".join(
                    [
                        str(index),
                        f"{_srt_time(segment.start)} --> {_srt_time(segment.end)}",
                        _segment_text(segment.text),
                    ]
                )
            )
            index += 1
    return "\n\n".join(blocks) + ("\n" if blocks else "")


def to_vtt(subtitles: SubtitleDocument) -> str:
    blocks = ["WEBVTT", ""]
    words_per_line = max(1, subtitles.words_per_line)
    for segment in subtitles.segments:
        if segment.words:
            words = segment.words
            for i in range(0, len(words), words_per_line):
                chunk = words[i : i + words_per_line]
                chunk_start = chunk[0].start
                chunk_end = chunk[-1].end
                text = " ".join(w.text for w in chunk)
                blocks.append(f"{_vtt_time(chunk_start)} --> {_vtt_time(chunk_end)}")
                blocks.append(_segment_text(text))
                blocks.append("")
        else:
            blocks.append(f"{_vtt_time(segment.start)} --> {_vtt_time(segment.end)}")
            blocks.append(_segment_text(segment.text))
            blocks.append("")
    return "\n".join(blocks)


def to_txt(subtitles: SubtitleDocument) -> str:
    blocks = []
    for segment in subtitles.segments:
        blocks.append(_segment_text(segment.text))
    return "\n".join(blocks) + ("\n" if blocks else "")


def _segment_text(text: str) -> str:
    return " ".join(text.split())


def _srt_time(seconds: float) -> str:
    return _format_time(seconds, ",")


def _vtt_time(seconds: float) -> str:
    return _format_time(seconds, ".")


def _format_time(seconds: float, separator: str) -> str:
    millis = round(max(0, seconds) * 1000)
    hours = millis // 3_600_000
    millis -= hours * 3_600_000
    minutes = millis // 60_000
    millis -= minutes * 60_000
    secs = millis // 1000
    millis -= secs * 1000
    return f"{hours:02d}:{minutes:02d}:{secs:02d}{separator}{millis:03d}"
