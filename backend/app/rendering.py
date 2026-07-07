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
        has_source_audio = _has_audio_stream(source)
        if has_source_audio:
            audio_filter = f"[0:a]volume=1[a0];[1:a]volume={settings.audio.bgm_volume}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[aout]"
        else:
            audio_filter = f"[1:a]volume={settings.audio.bgm_volume}[aout]"
        command.extend([
            "-filter_complex",
            f"[0:v]{video_filter}[vout];{audio_filter}",
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


def _has_audio_stream(source: Path) -> bool:
    command = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "a:0",
        "-show_entries",
        "stream=codec_type",
        "-of",
        "csv=p=0",
        str(source),
    ]
    try:
        result = subprocess.run(command, check=False, capture_output=True, text=True)
    except FileNotFoundError:
        return True
    return result.returncode == 0 and bool(result.stdout.strip())
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

    # Normalize style variables from either flat fields or nested preset objects
    font_family = style.font_family
    font_size = style.font_size
    font_weight = style.font_weight
    vertical_offset = style.vertical_offset
    text_color = style.text_color
    active_color = style.active_color
    shadow_color = style.shadow_color

    # Typography overrides
    if style.typography:
        font_family = style.typography.get("fontFamily", font_family)
        font_size = style.typography.get("fontSize", font_size)
        font_weight = style.typography.get("fontWeight", font_weight)

    # Fill overrides
    if style.fill:
        text_color = style.fill.get("textColor", text_color)
        active_color = style.fill.get("activeColor", active_color)

    # Position overrides
    if style.position:
        vertical_offset = style.position.get("verticalOffset", vertical_offset)

    # Shadow overrides
    if style.shadow:
        shadow_color = style.shadow.get("color", shadow_color)

    primary = _hex_to_ass(text_color)
    active = _hex_to_ass(active_color)
    outline = _hex_to_ass(shadow_color)

    # Calculate vertical margin (MarginV is from bottom)
    margin_v = max(20, int(1080 * (vertical_offset / 100)))

    # Border & Shadow styling configurations
    border_style = 1
    outline_val = 4
    shadow_val = 2
    back_colour = "&H80000000"

    # Load stroke values
    if style.stroke:
        if style.stroke.get("enabled"):
            border_style = 1
            outline_val = style.stroke.get("width", 4)
            outline = _hex_to_ass(style.stroke.get("color", shadow_color))
        else:
            outline_val = 0

    # Load shadow values
    if style.shadow:
        if style.shadow.get("enabled"):
            shadow_val = style.shadow.get("blur", 2)
            shadow_val = max(shadow_val, abs(style.shadow.get("offsetX", 0)) + abs(style.shadow.get("offsetY", 0)))
        else:
            shadow_val = 0

    # Load background values
    if style.background:
        if style.background.get("enabled"):
            border_style = 3  # Opaque background box
            bg_color = style.background.get("color", "#000000")
            bg_opacity = style.background.get("opacity", 0.72)
            back_colour = _hex_to_ass(bg_color, bg_opacity)

    # Compile style presets if set
    preset = style.preset.lower() if style.preset else ""
    if preset == "boxed" and (not style.background or not style.background.get("enabled")):
        border_style = 3
        back_colour = "&HB4000000"
        outline_val = 0
        shadow_val = 0

    lines = [
        "[Script Info]",
        "ScriptType: v4.00+",
        "PlayResX: 1920",
        "PlayResY: 1080",
        "",
        "[V4+ Styles]",
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
        f"Style: Default,{font_family},{font_size},{primary},{active},{outline},{back_colour},{1 if font_weight >= 700 else 0},0,0,0,100,100,0,0,{border_style},{outline_val},{shadow_val},2,80,80,{margin_v},1",
        "",
        "[Events]",
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ]

    words_per_line = max(1, subtitles.words_per_line)

    # Map animation styles to ASS formatting tags
    anim_preset = "pop"
    if isinstance(style.animation, dict):
        anim_preset = style.animation.get("enter", "pop")
    elif isinstance(style.animation, str):
        anim_preset = style.animation

    anim_preset = anim_preset.lower()
    anim_tag = ""
    if anim_preset == "pop":
        anim_tag = r"{\fscx90\fscy90\t(0,150,\fscx100\fscy100)}"
    elif anim_preset == "fade" or anim_preset == "fadein":
        anim_tag = r"{\alpha&HFF&\t(0,220,\alpha&H00&)}"
    elif anim_preset == "bounce" or anim_preset == "bouncein":
        anim_tag = r"{\fscx30\fscy30\t(0,150,\fscx112\fscy112)\t(150,280,\fscx100\fscy100)}"
    elif anim_preset == "zoomin":
        anim_tag = r"{\fscx50\fscy50\t(0,200,\fscx100\fscy100)}"
    elif anim_preset == "fadeinup" or anim_preset == "slideinup":
        anim_tag = r"{\alpha&HFF&\t(0,250,\alpha&H00&)}"
    elif anim_preset == "flip":
        anim_tag = r"{\frx90\t(0,250,\frx0)}"
    elif anim_preset == "pulse":
        anim_tag = r"{\t(0,150,\fscx110\fscy110)\t(150,300,\fscx100\fscy100)}"
    elif anim_preset == "rubberband":
        anim_tag = r"{\t(0,120,\fscx120\fscy80)\t(120,240,\fscx85\fscy115)\t(240,350,\fscx100\fscy100)}"
    elif anim_preset == "tada":
        anim_tag = r"{\t(0,100,\fscx95\fscy95\frz-3)\t(100,200,\fscx105\fscy105\frz3)\t(200,300,\fscx100\fscy100\frz0)}"

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

                    # Apply karaoke format highlights if enabled
                    karaoke_mode = "word"
                    if style.karaoke:
                        karaoke_mode = style.karaoke.get("mode", "word")

                    if karaoke_mode == "word":
                        parts.append(f"{{\\kf{dur_cs}}}{escaped_word}")  # Smooth Karaoke Fill!
                    else:
                        parts.append(escaped_word)
                text = anim_tag + " ".join(parts)
                lines.append(f"Dialogue: 0,{_ass_time(chunk_start)},{_ass_time(chunk_end)},Default,,0,0,0,,{text}")
        else:
            text = anim_tag + _escape_ass_text(segment.text)
            lines.append(f"Dialogue: 0,{_ass_time(segment.start)},{_ass_time(segment.end)},Default,,0,0,0,,{text}")
    path.write_text("\n".join(lines), encoding="utf-8")


def _karaoke_word(text: str, offset: float, duration: float) -> str:
    return f"{{\\k{max(1, round(duration * 100))}}}{text}"


def _hex_to_ass(value: str, opacity: float = 1.0) -> str:
    clean = value.strip().lstrip("#")
    if len(clean) != 6:
        return "&H00FFFFFF"
    r = clean[0:2]
    g = clean[2:4]
    b = clean[4:6]

    # ASS transparency goes from 00 (opaque) to FF (transparent)
    alpha_int = max(0, min(255, int((1.0 - opacity) * 255)))
    alpha_hex = f"{alpha_int:02X}"
    return f"&H{alpha_hex}{b}{g}{r}"
