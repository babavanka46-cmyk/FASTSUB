# FASTSUB UX/UI Rebuild Work Order

เป้าหมาย: ยกเครื่อง FASTSUB จาก prototype web UI ให้กลายเป็น desktop-style caption editor ที่ให้ความรู้สึกใกล้ CapCut PC / Filmora Wondershare โดยยังรักษา core เดิมที่ทำงานได้แล้ว: upload, Faster-Whisper transcription, transcript edit, Thai word repair, BGM render, SRT/VTT/ASS/TXT export, MP4 render

เอกสารนี้ใช้เป็นคำสั่งงานสำหรับ IDE / coding agent / senior frontend engineer

---

## 0. กฎสำคัญ

1. อย่าลบ core workflow ที่ทำงานได้แล้ว
2. อย่า rewrite backend ทั้งหมด
3. อย่าเพิ่มฟีเจอร์ปลอมที่คลิกแล้วไม่ทำงาน
4. ถ้ายังไม่ implement ให้ซ่อนหรือแสดง Coming Soon แบบไม่เด่น
5. ทุก preset ต้องใช้ source เดียวกันทั้ง preview และ render
6. UX ต้องเป็น desktop editor ไม่ใช่ landing page
7. ต้องผ่าน build และ smoke test ทุก phase

---

## 1. Current Stack

| Area | Stack |
|---|---|
| Frontend | React 19 + Vite |
| Backend | FastAPI |
| AI | faster-whisper |
| Render | FFmpeg + ASS |
| Ports | Frontend `5173`, Backend `8100` |

Important files:

| File | Purpose |
|---|---|
| `frontend/src/main.jsx` | App state orchestration |
| `frontend/src/components/*.jsx` | Current UI components |
| `frontend/src/styles.css` | Current styling |
| `backend/app/main.py` | API routes |
| `backend/app/rendering.py` | FFmpeg/ASS render |
| `backend/app/models.py` | Pydantic models |
| `backend/app/subtitle_export.py` | SRT/VTT/ASS/TXT export |

---

## 2. Product Direction

FASTSUB should feel like:

- CapCut PC for subtitle editing
- Filmora for approachable controls
- A local-first Thai subtitle production tool

FASTSUB should not feel like:

- A landing page
- A web form
- A prototype dashboard
- A set of disconnected panels

---

## 3. Target UX Structure

### 3.1 Project Hub

Replace current landing page with a real project hub.

Required layout:

- Left/top brand area: `FASTSUB`
- Primary action: `New Project`
- Secondary action: `Import Video`
- Recent projects grid/list
- Each project card:
  - thumbnail placeholder or generated thumbnail
  - project name
  - status: uploaded / transcribed / rendered / failed
  - last edited
  - quick actions: open, delete, reveal output if rendered

Remove from home:

- fake navigation chips
- YouTube URL field unless implemented
- decorative language/aspect/mode controls that do not persist
- delete project dropdown as primary UX

Home acceptance tests:

- [ ] User can create/import project clearly
- [ ] User can open recent project
- [ ] User can delete project through in-app confirm modal
- [ ] No dead controls visible
- [ ] Layout works at 1366x768, 1440x900, 1920x1080

---

## 4. Target Editor Layout

Use a CapCut/Filmora-style editor shell.

```
┌─────────────────────────────────────────────────────────────┐
│ Topbar: Project / Save / Whisper / Render / Export          │
├───────────────┬───────────────────────────┬─────────────────┤
│ Left Panel    │ Preview                   │ Right Inspector │
│ Media         │ Video + Caption Overlay   │ Caption Style   │
│ Transcript    │ Playback Controls         │ Animation       │
│ Captions      │                           │ Export          │
├───────────────┴───────────────────────────┴─────────────────┤
│ Timeline: captions / playhead / zoom / waveform placeholder │
└─────────────────────────────────────────────────────────────┘
```

### 4.1 Topbar

Must include:

- back to project hub
- project name
- save status
- Whisper status
- transcribe button
- render button
- export button

Rules:

- Keep it compact
- Do not overload with many selects
- Move Whisper settings into popover/panel
- Move render settings into export panel

### 4.2 Left Panel

Tabs:

- `Transcript`
- `Captions`
- `Media`

Transcript tab:

- search
- word list or segment list
- active caption auto-scroll
- delete word
- repair Thai words
- local spacing cleanup
- Gemini correction only if key exists

Captions tab:

- grouped captions by segment
- timing readout
- future: split/merge

Media tab:

- source video
- BGM file
- rendered outputs

### 4.3 Center Preview

Required:

- video preview
- caption overlay
- safe area
- aspect ratio selector
- zoom
- playback rate
- play/pause
- scrub bar
- current time / duration

Important:

- Preview must use the same preset object as render
- Do not show controls that do not work

### 4.4 Right Inspector

Tabs:

- `Presets`
- `Text`
- `Stroke`
- `Shadow`
- `Background`
- `Karaoke`
- `Animation`
- `Export`

This is the most important UX rebuild area.

### 4.5 Timeline

MVP timeline:

- playhead
- click to seek
- caption chips
- active segment label
- zoom display

Do not pretend to support drag/resize until implemented.

Future timeline:

- draggable captions
- resize handles
- snap
- multiselect
- waveform

---

## 5. Caption Preset Engine

Create a real preset system.

### 5.1 New Files

Create:

```text
frontend/src/presets/captionPresets.js
frontend/src/utils/captionStyle.js
frontend/src/components/CaptionPresetGrid.jsx
frontend/src/components/CaptionStyleInspector.jsx
frontend/src/components/CaptionPreviewText.jsx
```

Optional later:

```text
backend/app/caption_presets.py
```

### 5.2 Preset Schema

Use this shape:

```js
export const captionPresets = [
  {
    id: "thai_creator",
    name: "Thai Creator",
    description: "Bold Thai creator captions for Shorts/Reels/TikTok",
    typography: {
      fontFamily: "Noto Sans Thai",
      fontSize: 46,
      fontWeight: 900,
      lineHeight: 1.08,
      letterSpacing: 0
    },
    fill: {
      textColor: "#f4c64f",
      activeColor: "#ffffff",
      inactiveOpacity: 0.9
    },
    stroke: {
      enabled: true,
      width: 3,
      color: "#111111"
    },
    shadow: {
      enabled: true,
      color: "#000000",
      blur: 12,
      offsetX: 0,
      offsetY: 4
    },
    background: {
      enabled: false,
      color: "#000000",
      opacity: 0.72,
      radius: 8,
      paddingX: 10,
      paddingY: 4
    },
    position: {
      verticalOffset: 25,
      align: "center",
      maxWidth: 86
    },
    karaoke: {
      mode: "word",
      activeScale: 1.08,
      activeColorMode: "fill",
      dimInactive: false
    },
    animation: {
      enter: "pop",
      active: "pulse",
      exit: "fade",
      durationMs: 180
    }
  }
];
```

### 5.3 Required Presets

Implement at least:

1. `Thai Creator`
2. `TikTok Bold`
3. `Minimal White`
4. `Neon Glow`
5. `Boxed Caption`
6. `Podcast Clean`
7. `News Lower Third`
8. `Gaming Pop`

Each preset must:

- show a preview card
- apply to live preview
- persist to project settings
- map to render settings

---

## 6. Font System

Default font: `Noto Sans Thai`

Font list:

- Noto Sans Thai
- Anuphan
- Prompt
- Kanit
- Sarabun
- IBM Plex Sans Thai

Requirements:

- UI should preview mixed text: `ภาษาไทย FASTSUB 123`
- Do not use fonts that are not available unless bundled or clearly marked
- Backend render must use bundled/local fonts where possible

Acceptance:

- [ ] Thai tone marks render correctly in preview
- [ ] Thai tone marks render correctly in output MP4
- [ ] Emoji does not crash preview/render
- [ ] English + Thai mixed text looks acceptable

---

## 7. Animation System

### 7.1 Frontend Preview Animations

Create CSS classes or Motion.dev integration for:

- none
- fade
- pop
- slide-up
- bounce
- pulse
- typewriter
- karaoke-scale

MVP can be CSS-only.

### 7.2 Render Reality

Important: FFmpeg ASS cannot perfectly match all CSS animations.

Define support levels:

| Animation | Preview | Render |
|---|---|---|
| fade | yes | partial |
| pop | yes | partial via ASS transform |
| pulse active word | yes | partial |
| slide-up | yes | partial |
| typewriter | yes | no / future |

UI must show if a preset is:

- Preview only
- Render supported
- Render approximated

Do not lie to the user.

---

## 8. Karaoke Settings

Add UI controls:

- mode: none / word / line
- words per line: 1-5
- active word color
- active scale
- inactive opacity
- highlight style: fill / underline / background

Backend:

- use `words_per_line`
- use ASS karaoke tags `\k`
- group words according to selected words per line

Acceptance:

- [ ] Changing words per line updates preview
- [ ] Export SRT/VTT reflects grouping
- [ ] ASS render reflects grouping
- [ ] Reload project keeps karaoke settings

---

## 9. Settings Persistence

Project settings must persist:

```json
{
  "captionPresetId": "thai_creator",
  "captionStyle": {},
  "karaoke": {},
  "animation": {},
  "render": {},
  "whisper": {},
  "audio": {}
}
```

Current backend has `Project.settings`.

Required:

- `POST /api/project/{id}/settings`
- load settings when opening project
- debounce save settings from frontend
- save before render

Acceptance:

- [ ] Change preset
- [ ] Reload app
- [ ] Same preset and settings are restored

---

## 10. Rendering Integration

Backend render must map preset settings to ASS.

### 10.1 Extend RenderSettings

Add fields if needed:

```python
class StyleSettings(BaseModel):
    preset: str = "thai_creator"
    font_family: str = "Noto Sans Thai"
    font_size: int = 46
    font_weight: int = 900
    line_height: float = 1.08
    letter_spacing: int = 0
    text_color: str = "#f4c64f"
    active_color: str = "#ffffff"
    stroke_width: int = 3
    stroke_color: str = "#111111"
    shadow_color: str = "#000000"
    shadow_blur: int = 12
    background_enabled: bool = False
    background_color: str = "#000000"
    background_opacity: float = 0.72
    vertical_offset: int = 25
```

### 10.2 ASS Mapping

Map:

- font family
- font size
- bold
- primary color
- secondary active color
- outline color
- outline width
- shadow
- margin vertical
- alignment
- boxed background when possible
- karaoke tags

Acceptance:

- [ ] Rendered MP4 uses selected font
- [ ] Rendered MP4 uses selected colors
- [ ] Rendered MP4 uses stroke/shadow
- [ ] Words per line match preview/export

---

## 11. Recommended UI Libraries

Allowed:

- Radix UI primitives
- shadcn/ui style approach
- Motion.dev for preview animation

Do not add a large UI framework unless necessary.

If adding dependencies, document why.

Possible install commands:

```powershell
cd frontend
npm.cmd install @radix-ui/react-dialog @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-select
npm.cmd install motion
```

Use only if implementation really needs them.

---

## 12. Implementation Phases

### Phase A — Design System Foundation

Tasks:

- [ ] Create `captionPresets.js`
- [ ] Create style normalization helpers
- [ ] Create preset grid
- [ ] Create right inspector tabs
- [ ] Remove fake controls from visible primary UI

Test:

```powershell
cd frontend
npm.cmd run build
```

### Phase B — Editor Shell Rebuild

Tasks:

- [ ] Replace current editor layout with desktop editor shell
- [ ] Left panel tabs
- [ ] Center preview cleanup
- [ ] Right inspector rebuild
- [ ] Timeline remains but visually polished

Test:

- open project
- transcribe
- edit word
- save
- export

### Phase C — Caption Style Studio

Tasks:

- [ ] Preset cards
- [ ] Font controls
- [ ] Fill controls
- [ ] Stroke controls
- [ ] Shadow controls
- [ ] Background controls
- [ ] Karaoke controls
- [ ] Animation controls

Acceptance:

- every control changes preview
- no dead controls

### Phase D — Persistence

Tasks:

- [ ] Persist selected preset
- [ ] Persist style
- [ ] Persist karaoke
- [ ] Persist animation
- [ ] Persist render settings
- [ ] Restore on project open

### Phase E — Render Parity

Tasks:

- [ ] Extend backend style model
- [ ] Map preset to ASS
- [ ] Render test video
- [ ] Compare preview vs output

### Phase F — Polish

Tasks:

- [ ] responsive desktop sizes
- [ ] loading states
- [ ] disabled states
- [ ] tooltip descriptions
- [ ] keyboard shortcuts remain working
- [ ] no overflow

---

## 13. Commands

Start servers:

```powershell
cd D:\Ai-app-Project\FASTSUB
cmd /c run-backend-8100.bat
cmd /c run-frontend-5173-localhost.bat
```

Check servers:

```powershell
cd D:\Ai-app-Project\FASTSUB
cmd /c check-dev.bat
```

Build frontend:

```powershell
cd D:\Ai-app-Project\FASTSUB\frontend
npm.cmd run build
```

Compile backend:

```powershell
cd D:\Ai-app-Project\FASTSUB
python -m py_compile backend/app/main.py backend/app/models.py backend/app/storage.py backend/app/rendering.py backend/app/subtitle_export.py backend/app/transcription.py
```

Smoke API:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8100/api/health
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8100/api/projects
```

---

## 14. Regression Checklist

Must pass before marking rebuild complete:

- [ ] App opens at `http://127.0.0.1:5173`
- [ ] Backend health returns `{"status":"ok"}`
- [ ] Upload video works
- [ ] Project opens in editor
- [ ] Whisper transcribe works
- [ ] Transcript words display
- [ ] Edit word works
- [ ] Delete word works
- [ ] Repair Thai words works
- [ ] Change caption preset works
- [ ] Change font settings works
- [ ] Change karaoke settings works
- [ ] Settings persist after reload
- [ ] Export SRT works
- [ ] Export VTT works
- [ ] Export ASS works
- [ ] Export TXT works
- [ ] Render hard subtitle works
- [ ] Render uses chosen preset/font/colors
- [ ] No fake clickable controls visible
- [ ] Build passes

---

## 15. Non-goals For This Rebuild

Do not implement yet:

- full timeline drag/resize
- full translation engine
- SFX render engine
- full Remotion migration
- cloud sync
- user accounts

These can be future phases.

---

## 16. Final Acceptance Criteria

The rebuild is accepted when:

1. FASTSUB visually feels like a desktop caption editor
2. Caption style controls are rich and useful
3. Presets are not cosmetic only
4. Preview and render share the same settings model
5. No dead primary controls remain
6. Thai font rendering is first-class
7. User can create a professional-looking Thai karaoke subtitle without editing code

