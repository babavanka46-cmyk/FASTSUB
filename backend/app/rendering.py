from __future__ import annotations

import json
import subprocess
from pathlib import Path

from .models import ProjectStatus, RenderSettings, SubtitleDocument
from .storage import BASE_DIR, project_dir, update_project_status


def ensure_noto_sans_thai_fonts() -> Path:
    fonts_dir = Path(__file__).resolve().parent / "fonts"
    fonts_dir.mkdir(parents=True, exist_ok=True)
    
    regular_font = fonts_dir / "NotoSansThai-Regular.ttf"
    bold_font = fonts_dir / "NotoSansThai-Bold.ttf"
    
    import urllib.request
    
    urls = {
        regular_font: "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansThai/NotoSansThai-Regular.ttf",
        bold_font: "https://github.com/googlefonts/noto-fonts/raw/main/hinted/ttf/NotoSansThai/NotoSansThai-Bold.ttf"
    }
    
    for font_path, url in urls.items():
        if not font_path.exists():
            try:
                req = urllib.request.Request(
                    url, 
                    headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
                )
                with urllib.request.urlopen(req) as response, open(font_path, 'wb') as out_file:
                    out_file.write(response.read())
            except Exception as e:
                import logging
                logging.error(f"Failed to download Noto Sans Thai from {url}: {e}")
                
    return fonts_dir

RESOLUTIONS = {
    "720p": "1280:720",
    "1080p": "1920:1080",
    "1440p": "2560:1440",
}


def render_project(project_id: str, source_video: str, subtitles: SubtitleDocument, settings: RenderSettings) -> tuple[str | None, str]:
    render_dir = project_dir(project_id) / "renders"
    render_dir.mkdir(parents=True, exist_ok=True)
    subtitle_file = render_dir / "render-subtitles.ass"
    
    import time
    import re
    from .storage import get_project
    project = get_project(project_id)
    safe_project_name = re.sub(r'[\\/*?:"<>|]', "", Path(project.name).stem) or "video"
    output_file = render_dir / f"{safe_project_name}_{int(time.time())}.mp4"
    
    srt_file = render_dir / "render-subtitles.srt"
    write_ass_subtitles(subtitle_file, subtitles, settings)

    source = BASE_DIR / source_video
    if settings.subtitle_type == "soft":
        from .subtitle_export import to_srt

        srt_file.write_text(to_srt(subtitles), encoding="utf-8")
        output_url, message = _render_soft_subtitles(project_id, source, srt_file, output_file)
        return output_url, message

    fonts_dir = ensure_noto_sans_thai_fonts()
    escaped_subtitle_file = _escape_filter_path(subtitle_file)
    escaped_fonts_dir = _escape_filter_path(fonts_dir)
    video_filter = f"scale={RESOLUTIONS[settings.resolution]},subtitles='{escaped_subtitle_file}':fontsdir='{escaped_fonts_dir}'"
    command = ["ffmpeg", "-y", "-i", str(source)]
    bgm_file = BASE_DIR / settings.audio.bgm_path if settings.audio.bgm_path else None
    if bgm_file and bgm_file.exists():
        command.extend(["-stream_loop", "-1" if settings.audio.bgm_loop else "0", "-i", str(bgm_file)])
        command.extend([
            "-filter_complex",
            f"[0:v]{video_filter}[vout];[0:a]volume=1[a0];[1:a]volume={settings.audio.bgm_volume}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]",
            "-map",
            "[vout]",
            "-map",
            "[aout]",
        ])
    else:
        command.extend(["-vf", video_filter])
    command.extend([
        "-r",
        str(settings.fps),
        "-c:v",
        "libx264",
        "-preset",
        "medium",
        "-crf",
        "18",
        "-c:a",
        "aac",
        "-shortest",
        str(output_file),
    ])
    (render_dir / "render-settings.json").write_text(settings.model_dump_json(indent=2), encoding="utf-8")
    (render_dir / "render-command.json").write_text(json.dumps(command, indent=2), encoding="utf-8")
    update_project_status(project_id, ProjectStatus.rendering)
    try:
        subprocess.run(command, check=True, capture_output=True, text=True)
    except FileNotFoundError:
        update_project_status(project_id, ProjectStatus.failed)
        return None, "FFmpeg was not found. Install FFmpeg and rerun render."
    except subprocess.CalledProcessError as exc:
        update_project_status(project_id, ProjectStatus.failed)
        return None, exc.stderr[-1000:] or "FFmpeg render failed."

    relative_output = str(output_file.relative_to(BASE_DIR))
    update_project_status(project_id, ProjectStatus.rendered, rendered_video=relative_output)
    url_path = relative_output.replace("\\", "/")
    return f"/media/{url_path}", "Render complete."


def _render_soft_subtitles(project_id: str, source: Path, subtitle_file: Path, output_file: Path) -> tuple[str | None, str]:
    render_dir = output_file.parent
    command = [
        "ffmpeg",
        "-y",
        "-i",
        str(source),
        "-i",
        str(subtitle_file),
        "-map",
        "0",
        "-map",
        "1",
        "-c:v",
        "copy",
        "-c:a",
        "copy",
        "-c:s",
        "mov_text",
        "-metadata:s:s:0",
        "language=und",
        str(output_file),
    ]
    (render_dir / "render-command.json").write_text(json.dumps(command, indent=2), encoding="utf-8")
    update_project_status(project_id, ProjectStatus.rendering)
    try:
        subprocess.run(command, check=True, capture_output=True, text=True)
    except FileNotFoundError:
        update_project_status(project_id, ProjectStatus.failed)
        return None, "FFmpeg was not found. Install FFmpeg and rerun render."
    except subprocess.CalledProcessError as exc:
        update_project_status(project_id, ProjectStatus.failed)
        return None, exc.stderr[-1000:] or "FFmpeg soft subtitle render failed."

    relative_output = str(output_file.relative_to(BASE_DIR))
    update_project_status(project_id, ProjectStatus.rendered, rendered_video=relative_output)
    url_path = relative_output.replace("\\", "/")
    return f"/media/{url_path}", "Soft subtitle render complete."


def _ass_time(seconds: float) -> str:
    centis = round(seconds * 100)
    hours = centis // 360000
    centis %= 360000
    minutes = centis // 6000
    centis %= 6000
    secs = centis // 100
    centis %= 100
    return f"{hours}:{minutes:02d}:{secs:02d}.{centis:02d}"


def _escape_filter_path(path: Path) -> str:
    value = path.resolve().as_posix()
    return value.replace("\\", "/").replace(":", "\\:").replace("'", "\\'")


def _escape_ass_text(text: str) -> str:
    text = text.replace("\\", "\\\\")
    text = text.replace("{", "(").replace("}", ")")
    text = text.replace("\r\n", "\\N").replace("\n", "\\N")
    return text


def write_ass_subtitles(path: Path, subtitles: SubtitleDocument, settings: RenderSettings) -> None:
    style = settings.style
    primary = _hex_to_ass(style.text_color)
    active = _hex_to_ass(style.active_color)
    outline = _hex_to_ass(style.shadow_color)
    margin_v = max(20, 1080 - int(1080 * (style.vertical_offset / 100)))
    lines = [
        "[Script Info]",
        "ScriptType: v4.00+",
        "PlayResX: 1920",
        "PlayResY: 1080",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: Default,{style.font_family},{style.font_size},{primary},{active},{outline},&H80000000,{1 if style.font_weight >= 700 else 0},0,0,0,100,100,0,0,1,4,2,2,80,80,{margin_v},1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]
    
    words_per_line = max(1, subtitles.words_per_line)
    
    for segment in subtitles.segments:
        if segment.words:
            words = segment.words
            for i in range(0, len(words), words_per_line):
                chunk = words[i : i + words_per_line]
                chunk_start = chunk[0].start
                chunk_end = chunk[-1].end
                
                parts = []
                for w in chunk:
                    dur_cs = max(1, round((w.end - w.start) * 100))
                    escaped_word = _escape_ass_text(w.text)
                    parts.append(f"{{\\k{dur_cs}}}{escaped_word}")
                text = " ".join(parts)
                lines.append(f"Dialogue: 0,{_ass_time(chunk_start)},{_ass_time(chunk_end)},Default,,0,0,0,,{text}")
        else:
            text = _escape_ass_text(segment.text)
            lines.append(f"Dialogue: 0,{_ass_time(segment.start)},{_ass_time(segment.end)},Default,,0,0,0,,{text}")
    path.write_text("\n".join(lines), encoding="utf-8")


def _karaoke_word(text: str, offset: float, duration: float) -> str:
    return f"{{\\k{max(1, round(duration * 100))}}}{text}"


def _hex_to_ass(value: str) -> str:
    clean = value.strip().lstrip("#")
    if len(clean) != 6:
        clean = "ffffff"
    rr, gg, bb = clean[0:2], clean[2:4], clean[4:6]
    return f"&H00{bb}{gg}{rr}"
