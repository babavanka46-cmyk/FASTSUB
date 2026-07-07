# FASTSUB — PROJECT AUDIT

> **วันที่ตรวจครั้งแรก:** 6 ก.ค. 2026  
> **ยืนยันซ้ำล่าสุด:** 7 ก.ค. 2026 (หลัง `git pull`, branch `main` @ `4554fde`)  
> **สถานะเอกสาร:** ✅ **พร้อมใช้งาน** — ตรงกับโค้ดปัจจุบัน, บั๊กที่ระบุยังไม่ถูกแก้ในโค้ด  
> **ผู้ตรวจ:** Senior Full-Stack + QA (จากโค้ดจริงเท่านั้น ไม่เดา)  
> **ขอบเขต:** `frontend/`, `backend/app/`, `extension/`  
> **คู่มือแก้ไข:** [`FIX_PLAN.md`](./FIX_PLAN.md)  
> **การยืนยัน build/test (7 ก.ค. 2026):** `python -m compileall app` ผ่าน | `npm run build` ผ่าน (Vite 6.4.3) | `npm test` ผ่าน 12/12

### สรุปการยืนยันซ้ำ (7 ก.ค. 2026)

| รายการ | ผล |
|--------|-----|
| โครงสร้าง hooks + routers | ตรงกับเอกสาร |
| C-01 BGM endpoint ผิด (`TranscriptPanel.jsx:643`) | **ยังมีบั๊ก** |
| C-02 ลบแถวซับ stale loop (`TranscriptPanel.jsx:479`) | **ยังมีบั๊ก** |
| H-01 URL `rendered_video` ผิด (`TranscriptPanel.jsx:664`) | **ยังมีบั๊ก** |
| ลบโปรเจกต์ (`routers/projects.py`) | ทำงานแล้ว |
| regroup words/line + video proxy streaming | ทำงานแล้ว (commit `117b75d`) |

---

## 1. สรุป Architecture

### 1.1 ภาพรวมระบบ

FASTSUB เป็นแอปแก้ไขซับไตเติ้ลภาษาไทยแบบ **local-first** ประกอบด้วย 3 ส่วน:

```mermaid
flowchart TB
  subgraph client [Client]
    UI[React SPA<br/>Vite :5173]
    EXT[Chrome Extension MV3]
  end
  subgraph server [Backend]
    API[FastAPI :8100]
    WHISPER[faster-whisper]
    FFMPEG[FFmpeg subprocess]
  end
  subgraph storage [Storage]
    JSON[project.json / subtitles.json]
    MEDIA[storage/projects/*/uploads|audio|renders|exports]
  end
  UI -->|apiRequest fetch| API
  EXT -->|fetch localhost:8100| API
  API --> WHISPER
  API --> FFMPEG
  API --> JSON
  API --> MEDIA
```

### 1.2 Tech Stack

| Layer | เทคโนโลยี |
|-------|-----------|
| Frontend | React 19, Vite 6, vanilla CSS, Lucide icons, Vitest |
| Backend | FastAPI, Pydantic v2, Uvicorn |
| AI/Media | faster-whisper, pythainlp, FFmpeg |
| Extension | Chrome MV3 (`popup.js`, `background.js`) |
| Persistence | JSON files ใต้ `backend/storage/projects/` |

### 1.3 โครงสร้างโฟลเดอร์หลัก

```
FASTSUB/
├── frontend/src/
│   ├── main.jsx                 # App root, state orchestration
│   ├── api.js                   # apiRequest helper
│   ├── subtitleUtils.js         # caption text + preview helpers
│   ├── context/EditorContext.jsx
│   ├── hooks/                   # useProjects, useTranscription, useRender, useAutosave, useEditorHistory
│   ├── utils/                   # subtitleDocument, captionStyle, videoUploadValidation
│   ├── components/              # Landing, Editor, TranscriptPanel, PreviewPanel, TimelinePanel, CaptionStyleInspector
│   └── presets/                 # captionPresets, animationPresets
├── backend/app/
│   ├── main.py                  # CORS, media streaming, router mount
│   ├── routers/                 # projects.py, transcription.py, renders.py
│   ├── storage.py, transcription.py, rendering.py, subtitle_export.py
│   └── models.py
└── extension/                   # Gemini correction bridge
```

### 1.4 Routing / Navigation

- **ไม่มี client-side router** — สลับหน้าด้วย `!project ? <Landing /> : <Editor />` ใน `main.jsx`
- API แยกเป็น 3 routers ภายใต้ prefix `/api`

### 1.5 API Surface (ยืนยันจากโค้ด)

| Method | Endpoint | สถานะ |
|--------|----------|--------|
| GET | `/api/health` | ทำงาน |
| GET/POST | `/api/projects`, `/api/projects/upload` | ทำงาน (+ validate size/ext) |
| DELETE | `/api/project/{id}` | ทำงาน (`project_dir` import ถูกต้องใน `routers/projects.py:7`) |
| GET/POST | `/api/project/{id}/subtitles` | ทำงาน (+ validate timing) |
| POST | `/api/project/{id}/settings` | ทำงาน |
| POST | `/api/project/{id}/transcribe` | ทำงาน (sync blocking) |
| POST | `/api/project/{id}/autocorrect` | ทำงาน (local = spacing, gemini = AI) |
| POST | `/api/project/{id}/subtitles/repair-thai-words` | ทำงาน |
| POST | `/api/project/{id}/translate` | **501 Not Implemented** |
| POST | `/api/project/{id}/assets/bgm` | ทำงาน |
| POST | `/api/project/{id}/render` | ทำงาน (hard/soft) |
| POST | `/api/project/{id}/subtitles/export` | ทำงาน |
| GET | `/media/storage/{path}` | ทำงาน (range streaming + static mount) |

---

## 2. สิ่งที่ทำงานได้แล้ว (Baseline)

| ฟีเจอร์ | หลักฐาน |
|---------|---------|
| อัปโหลดวิดีโอ + extract audio + video proxy | `routers/projects.py:40-50`, `transcription.py:272-307` |
| ถอดเสียง Whisper + ตั้งค่า toolbar | `useTranscription.js:40-73`, `Editor.jsx:147-208` |
| แก้ไขคำ / segment, undo-redo, autosave | `main.jsx`, `useEditorHistory.js`, `useAutosave.js` |
| แยก/รวม segment, แยกคำ, regroup words/line | `subtitleDocument.js`, `TranscriptPanel.jsx` |
| Export SRT/VTT/ASS/TXT + download blob | `useRender.js:63-89` |
| Render hard subtitle + BGM mix | `rendering.py:47-117` |
| ลบโปรเจกต์ + modal confirm | `Landing.jsx:70-83,246-267` |
| Loading state บางส่วน | `main.jsx:70-77`, `Editor.jsx:120-123` |
| Gemini autocorrect (backend) | `routers/transcription.py:165-176` |
| Extension error handling | `extension/popup.js:31-61` |
| Unit tests subtitle mutations | `subtitleDocument.test.js` — 12 tests pass |

---

## 3. รายการบั๊กและปัญหา (จัดตามความรุนแรง)

---

### CRITICAL

#### C-01 — BGM upload ในแท็บ Media เรียก API ผิด

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `frontend/src/components/TranscriptPanel.jsx:637-648` |
| **อาการ** | อัปโหลด BGM จากแท็บ "มีเดีย" ล้มเหลว (404) |
| **Root cause** | Frontend เรียก `POST /api/project/{id}/bgm` แต่ backend ลงทะเบียนที่ `POST /api/project/{id}/assets/bgm` (`routers/renders.py:18`) |
| **หลักฐานเพิ่ม** | Response field ผิด: frontend อ่าน `data.bgm_path` แต่ API คืน `{ path, url }` (`renders.py:24`) |
| **หลักฐานที่ทำงาน** | `InspectorPanel.jsx:78-82` ใช้ endpoint ถูกต้อง แต่ไฟล์นี้ **ไม่ถูก import ใช้งาน** (dead component) |

---

#### C-02 — ลบทั้งแถวซับลบได้แค่ 1 คำ (stale state ใน loop)

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `frontend/src/components/TranscriptPanel.jsx:477-481` |
| | `frontend/src/components/SubtitleExpandedEditor.jsx:478` |
| **อาการ** | กด "ลบ" ที่แถวที่มีหลายคำ — คาดว่าลบทั้งแถว แต่ลบได้ไม่ครบ |
| **Root cause** | `row.words.forEach((word) => onDeleteWord(...))` เรียก `deleteWord` หลายครั้งใน tick เดียว โดยทุกครั้งใช้ `subtitles` state เดิมจาก closure (`main.jsx:218-221`) ไม่ใช่ผลลัพธ์สะสม |
| **ผลกระทบ** | การลบหลายคำในแถวเดียวไม่ถูกต้อง; history/dirty state ผิดพลาด |

---

### HIGH

#### H-01 — URL วิดีโอที่เรนเดอร์แล้วผิด path

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `frontend/src/components/TranscriptPanel.jsx:664,669` |
| **อาการ** | แท็บ Media แสดง/ดาวน์โหลด rendered video ไม่ได้ |
| **Root cause** | `project.rendered_video` เก็บค่า relative เช่น `storage/projects/.../renders/out.mp4` (`rendering.py:114-115`) แต่ frontend ใช้ `${API}${project.rendered_video}` → `http://localhost:8100/storage/...` ซึ่ง **ไม่มี route** |
| **Route ที่ถูก** | ต้องเป็น `${API}/media/${project.rendered_video}` (สอดคล้องกับ video source: `PreviewPanel.jsx:35`) |

---

#### H-02 — หลัง Render สำเร็จ UI ไม่อัปเดต `rendered_video`

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `frontend/src/hooks/useRender.js:38-60` |
| **Root cause** | `renderVideo` แสดงแค่ `result.message` ไม่ refresh project จาก API หลัง render |
| **ผลกระทบ** | แม้แก้ H-01 แล้ว ผู้ใช้ต้องปิด/เปิดโปรเจกต์ใหม่ถึงจะเห็นวิดีโอ render ในแท็บ Media |

---

#### H-03 — Soft subtitle render ไม่ใช้ style / resolution / fps / BGM

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `backend/app/rendering.py:63-68,120-157` |
| **Root cause** | `_render_soft_subtitles` ใช้ `-c:v copy -c:a copy` + embed SRT เท่านั้น ไม่อ่าน `settings.style`, `settings.resolution`, `settings.audio` |
| **ผลกระทบ** | UI ให้เลือก soft + style แต่ผลลัพธ์ไม่ตรง preview |

---

#### H-04 — Hard render + BGM อาจล้มเมื่อวิดีโอไม่มี audio track

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `backend/app/rendering.py:76-85` |
| **Root cause** | `amix` อ้าง `[0:a]` โดยไม่ตรวจว่า source มี audio stream |
| **ผลกระทบ** | FFmpeg error ไม่ชัดเจน (คืน stderr ท้าย 1000 ตัวอักษร) |

---

#### H-05 — Transcribe / Render เป็น synchronous HTTP (timeout risk)

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `routers/transcription.py:144-157`, `rendering.py:105-112` |
| **Root cause** | ไม่มี job queue / progress / cancel |
| **ผลกระทบ** | วิดีโอยาว → request ค้าง, UI รอ, browser/proxy timeout |

---

#### H-06 — Upload บล็อกด้วย video proxy แบบ synchronous

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `routers/projects.py:41-42`, `transcription.py:272-307` |
| **Root cause** | `create_video_proxy()` รัน FFmpeg ใน request upload สำหรับ HEVC/ไฟล์ >50MB |
| **ผลกระทบ** | อัปโหลดค้างนาน, UX แย่, timeout ได้ |

---

#### H-07 — Preview แสดงคำทั้ง segment เมื่อ segment ยาว (ก่อน regroup)

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `frontend/src/subtitleUtils.js:110-125`, `main.jsx:148-150` |
| **Root cause** | `getActivePreviewWords(segment)` คืนทุกคำใน segment (ไม่ slice ตาม `wordsPerLine` หรือ active line); `regroupSubtitlesByWordsPerLine` ทำงานเมื่อผู้ใช้กดปุ่มเท่านั้น ไม่รันหลัง transcribe |
| **หมายเหตุ** | `main.jsx:149` ส่ง `currentTime` เป็น arg ที่ 2 แต่ function รับแค่ 1 param — arg ถูกละเว้น (dead call signature) |

---

#### H-08 — `anyLoading` ไม่ครอบคลุม autocorrect / repairThai

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `frontend/src/components/Editor.jsx:120-123` |
| **Root cause** | `anyLoading` รวมแค่ upload/transcribe/render — ไม่รวม `autocorrect`, `repairThai` |
| **ผลกระทบ** | สลับโปรเจกต์ / กด action อื่นระหว่าง autocorrect ได้ |

---

#### H-09 — Export ASS ไม่ส่ง style จาก UI

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `backend/app/routers/renders.py:33-40`, `subtitle_export.py:31-33` |
| **Root cause** | `export_project_subtitles` ไม่รับ/ส่ง `RenderSettings`; ASS ใช้ `RenderSettings()` default |
| **ผลกระทบ** | Export ASS ไม่ตรงกับ style ที่ตั้งใน editor |

---

### MEDIUM

#### M-01 — Dead code: `InspectorPanel.jsx` ทั้งไฟล์

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `frontend/src/components/InspectorPanel.jsx` |
| **หลักฐาน** | `grep InspectorPanel` พบเฉพาะในไฟล์ตัวเอง; Editor ใช้ `CaptionStyleInspector` แทน (`Editor.jsx:88`) |
| **ความเสี่ยง** | BGM upload ที่ถูกต้องอยู่ใน dead file; developer อาจแก้ผิดไฟล์ |

---

#### M-02 — UI ซ้ำซ้อน: Export/Render 2 จุด

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `Editor.jsx:225-257`, `CaptionStyleInspector.jsx:504-549` |
| **ผลกระทบ** | UX สับสน, maintenance ซ้ำ, behavior อาจ diverge |

---

#### M-03 — `isLoading.export` ถูกอ่านแต่ไม่เคย set

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `CaptionStyleInspector.jsx:57-59`, `useRender.js:63-89` |
| **Root cause** | `exportSubtitles` ไม่เรียก `setLoading('export', ...)` |
| **ผลกระทบ** | `exportBusy` ใช้ได้แค่ block ตอน render ไม่ใช่ export |

---

#### M-04 — BGM path URL สร้างแบบ hacky

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `TranscriptPanel.jsx:280` |
| **Root cause** | `bgm_path.split('/storage/').pop()` แทน helper เดียวกับ video path |
| **ผลกระทบ** | path format เปลี่ยน → audio preview พัง |

---

#### M-05 — Duration fallback 22 วินาที

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `frontend/src/main.jsx:130-133` |
| **Root cause** | `Math.max(22, ...)` เมื่อ `videoDuration` ยังเป็น 0 |
| **ผลกระทบ** | Timeline/playhead ผิดสำหรับคลิปสั้นก่อน video metadata โหลด |

---

#### M-06 — `beforeunload` ไม่เช็ค `saveStatus === 'saving'`

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `frontend/src/components/Editor.jsx:66-79` |
| **Root cause** | เช็คแค่ `isDirty` |
| **ผลกระทบ** | ปิดแท็บระหว่าง autosave อาจเตือนซ้ำหรือขัดกับ save ที่กำลังทำ |

---

#### M-07 — Concurrent autosave (subtitles 3s + settings 2s)

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `frontend/src/hooks/useAutosave.js` |
| **Root cause** | ไม่มี mutex/sequence; race ได้เมื่อแก้ subtitle + style พร้อมกัน |
| **ผลกระทบ** | save สลับลำดับ, `isDirty` อาจไม่สอดคล้อง |

---

#### M-08 — `get_project` corrupt JSON → 500 แทน 404/422

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `backend/app/storage.py:93-94`, `routers/projects.py:12-16` |
| **Root cause** | `_require_project` จับแค่ `FileNotFoundError` ไม่จับ `ValueError` |

---

#### M-09 — Dev scripts ชี้ path ผิดเครื่อง

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `run-dev.bat:2`, `run-backend-8100.bat:2`, `check-dev.bat:2` |
| **Root cause** | Hardcode `D:\Ai-app-Project\FASTSUB` แทน path จริงของ repo |
| **ผลกระทบ** | double-click script ไม่ทำงานบนเครื่อง dev อื่น |

---

#### M-10 — Landing status ใช้ field ที่ไม่มีใน model

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `frontend/src/components/Landing.jsx:88` |
| **Root cause** | `proj.subtitles_path` ไม่มีใน `Project` model (`models.py:40-49`) — condition เป็น falsy เสมอ |

---

#### M-11 — Translation ปิดใน UI / 501 ใน API

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `routers/transcription.py:178-181`, `InspectorPanel.jsx:159` (dead) |
| **สถานะ** | ถูกต้องที่ปิด แต่ยังมี stub ค้างใน dead component |

---

#### M-12 — SFX ยังไม่ implement

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `main.jsx:37-39`, `InspectorPanel.jsx:199-208` (dead), `models.py:79-81` |
| **สถานะ** | state มี `sfx_*` แต่ไม่มี backend/render pipeline |

---

#### M-13 — `apiRequest` แสดง error ไม่ชัดเมื่อ `detail` เป็น array

| รายการ | รายละเอียด |
|--------|------------|
| **ไฟล์** | `frontend/src/api.js:7-9` |
| **Root cause** | FastAPI validation errors คืน `detail: [{...}]` — `new Error(detail)` ได้ `[object Object]` |

---

### LOW

#### L-01 — Dead function `_karaoke_word` ใน backend

| ไฟล์ | `backend/app/rendering.py:334-335` |

#### L-02 — Unused dependency `requests` ใน requirements

| ไฟล์ | `backend/requirements.txt:6` — ไม่พบ import ใน `backend/app/` |

#### L-03 — Duplicate `Brand` component

| ไฟล์ | `Editor.jsx:263-272`, `Landing.jsx:272-283` |

#### L-04 — Timeline click: ตัวแปร `ratio` ไม่ถูกใช้

| ไฟล์ | `TimelinePanel.jsx:107` |

#### L-05 — Toast เป็น `<button>` string เดียว ไม่แยก success/error

| ไฟล์ | `main.jsx:350` |

#### L-06 — `html lang="en"` แอปหลักเป็นภาษาไทย

| ไฟล์ | `frontend/index.html:2` |

#### L-07 — Whisper model cache ไม่มี eviction

| ไฟล์ | `transcription.py:16-17,109-122` — `_MODEL_CACHE` โตตลอด session |

#### L-08 — Gemini API key ส่งใน URL query string

| ไฟล์ | `routers/transcription.py:39`, `extension/popup.js:82` |

#### L-09 — ไม่มี authentication บน local API

| ไฟล์ | ทุก route ใน `backend/app/` — ยอมรับได้สำหรับ localhost เท่านั้น |

#### L-10 — Font `@font-face` อ้าง `/media/storage/fonts/...` — resolve ตอน runtime

| ไฟล์ | `styles.css:6-61` — ไฟล์มีจริงที่ `backend/storage/fonts/` (ยืนยัน glob 13 ไฟล์) |

---

## 4. UI / ปุ่ม / ฟังก์ชันที่ยังไม่เชื่อม logic

| UI Element | ไฟล์ | สถานะ | หลักฐาน |
|------------|------|--------|---------|
| BGM upload (แท็บ Media) | `TranscriptPanel.jsx:628-649` | **เสีย** | endpoint/field ผิด (C-01) |
| BGM upload (InspectorPanel) | `InspectorPanel.jsx:70-89` | ถูกต้องแต่ **dead code** | ไม่ถูก import |
| BGM ใน CaptionStyleInspector | `CaptionStyleInspector.jsx:570-572` | disabled redirect | ปุ่ม disabled |
| แปลภาษา | `routers/transcription.py:181` | 501 | `HTTPException(501)` |
| SFX | `InspectorPanel.jsx:199-208` | disabled stub | dead code |
| Plugin rail | `InspectorPanel.jsx:280` | disabled | dead code |
| แสดง rendered video | `TranscriptPanel.jsx:657-675` | **เสีย** | URL ผิด (H-01) |
| Export ASS with style | export endpoint | **บางส่วน** | default style (H-09) |
| Soft render + style | `rendering.py:63-68` | **บางส่วน** | copy stream only (H-03) |
| ลบทั้งแถว transcript | `TranscriptPanel.jsx:477-481` | **เสีย** | stale loop (C-02) |
| Fullscreen preview | `PreviewPanel.jsx:106-113` | ทำงาน | `requestFullscreen` |
| Timeline split | `TimelinePanel.jsx:63-69` | ทำงาน | เชื่อม `onSplitSegment` |
| ซ่อมคำไทย | `TranscriptPanel.jsx:399-406` | ทำงาน | `onRepairThai` |
| Words/line regroup | `main.jsx:260-267` | ทำงานเมื่อกดปุ่ม | ไม่ auto หลัง transcribe |

---

## 5. Frontend ↔ Backend Contract Mismatches

| จุด | Frontend คาดหวัง | Backend ส่งจริง | ไฟล์ |
|-----|------------------|-----------------|------|
| BGM upload URL | `/api/project/{id}/bgm` | `/api/project/{id}/assets/bgm` | TranscriptPanel vs renders.py |
| BGM response field | `bgm_path` | `path`, `url` | TranscriptPanel:645 vs renders.py:24 |
| Rendered video URL | `${API}${rendered_video}` | ต้อง `${API}/media/${rendered_video}` | TranscriptPanel vs storage path |
| Translate | คาดหวัง 200 + document | 501 | transcription.py:181 |
| Project status | `subtitles_path` | ไม่มี field | Landing.jsx:88 vs models.py |
| ASS export style | style จาก editor | default `RenderSettings()` | renders.py:40 |

---

## 6. Build / Test / Runtime

| การตรวจ | ผล |
|---------|-----|
| `python -m compileall backend/app` | ✅ ผ่าน |
| `npm install && npm run build` (Vite 6.4.3) | ✅ ผ่าน |
| `npm test` (vitest) | ✅ 12/12 ผ่าน |
| `npx vite build` (ดึง Vite 8 ชั่วคราว) | ❌ ล้ม — ไม่มี node_modules react (ใช้ npx global ผิด env) |
| Runtime E2E | ไม่ได้รันในรอบนี้ (ไม่มี server/FFmpeg/Whisper ใน session) |

---

## 7. Performance / Memory / Security

### Performance
- Video proxy บน upload (H-06)
- Sync transcribe/render (H-05)
- `structuredClone` ทุก edit ใน `subtitleDocument.js` — ยอมรับได้สำหรับโปรเจกต์ขนาดกลาง

### Memory
- `_MODEL_CACHE` ไม่ evict (L-07)
- Event listeners ใน PreviewPanel cleanup ถูกต้อง (`PreviewPanel.jsx:55-58`)
- `AbortController` ใน `useProjects.js:45-68` ป้องกัน race บางส่วน

### Security
- ไม่มี auth (L-09)
- Media serve จาก `STORAGE_DIR` เท่านั้น (`main.py:41-42`) — ดีกว่าเวอร์ชันเก่าที่ mount ทั้ง BASE_DIR
- Gemini key ใน query string (L-08)
- CORS เปิด `chrome-extension://*` (`main.py:20-28`)
- Upload validate 500MB + extension (`projects.py:32-38`, `videoUploadValidation.js`)

---

## 8. สรุปจำนวนปัญหา

| ระดับ | จำนวน |
|-------|-------|
| Critical | 2 |
| High | 9 |
| Medium | 13 |
| Low | 10 |

**ลำดับแก้ที่แนะนำ:** C-01 → C-02 → H-01 → H-02 → H-07 → H-08 → ที่เหลือตาม `FIX_PLAN.md`

---

*เอกสารนี้อิงจาก source code ณ วันตรวจเท่านั้น ไม่รวมการทดสอบ E2E บน FFmpeg/Whisper จริง*

*อัปเดตล่าสุด: 7 ก.ค. 2026 — ยืนยันซ้ำหลัง pull แล้ว เนื้อหาหลักยังใช้งานได้ บั๊ก C-01/C-02/H-01 ยังไม่ถูกแก้ในโค้ด*
