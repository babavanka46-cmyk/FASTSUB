# FASTSUB — FIX PLAN

> **อ้างอิง:** [`PROJECT_AUDIT.md`](./PROJECT_AUDIT.md)  
> **หลักการ:** แก้ทีละขั้น ไม่ลบฟังก์ชันที่ทำงานอยู่ ทดสอบหลังแต่ละ phase  
> **เป้าหมาย:** unblock core bugs ก่อน → คุณภาพ UX → scale/harden

---

## Phase 0 — Critical Fixes (ทำก่อน ไม่ข้าม)

### Step 0.1 — แก้ BGM upload ในแท็บ Media

| รายการ | รายละเอียด |
|--------|------------|
| **Audit ID** | C-01 |
| **ไฟล์** | `frontend/src/components/TranscriptPanel.jsx` |
| **บรรทัด** | ~637-648 |

**วิธีแก้:**
1. เปลี่ยน endpoint เป็น `apiRequest(\`/api/project/${project.id}/assets/bgm\`, { method: 'POST', body: form })`
2. อ่าน `response.path` แทน `data.bgm_path`
3. ใช้ `setToast` แจ้ง success/error (อย่า `console.error` อย่างเดียว)
4. (แนะนำ) สร้าง helper `mediaUrl(relativePath)` ใน `api.js`:
   ```js
   export function mediaUrl(relativePath) {
     if (!relativePath) return null;
     const normalized = relativePath.replaceAll('\\', '/');
     return `${API}/media/${normalized}`;
   }
   ```

**ความเสี่ยง regression:** ต่ำ — แก้เฉพาะ path ที่เสียอยู่แล้ว  
**อย่าแตะ:** `InspectorPanel.jsx` (dead code — จัดการใน Phase 3)

**Checklist หลังแก้:**
- [ ] อัปโหลด MP3 จากแท็บ Media → ได้ toast สำเร็จ
- [ ] `audioSettings.bgm_path` ถูก set
- [ ] `<audio src={bgmSrc}>` เล่นได้
- [ ] Render พร้อม BGM ได้ (hard subtitle)

---

### Step 0.2 — แก้ลบทั้งแถว transcript

| รายการ | รายละเอียด |
|--------|------------|
| **Audit ID** | C-02 |
| **ไฟล์** | `frontend/src/utils/subtitleDocument.js` (เพิ่ม function ใหม่) |
| | `frontend/src/main.jsx` |
| | `frontend/src/components/TranscriptPanel.jsx` |
| | `frontend/src/components/SubtitleExpandedEditor.jsx` |

**วิธีแก้:**
1. เพิ่ม `deleteSubtitleRow(subtitles, segmentId, wordIds)` ใน `subtitleDocument.js` ที่ลบหลาย word ใน transaction เดียว (clone ครั้งเดียว)
2. ใน `main.jsx` เพิ่ม `deleteRow(segmentId, wordIds)` เรียก utility แล้ว `pushToHistory` ครั้งเดียว
3. แทนที่ `row.words.forEach(onDeleteWord)` ด้วย `onDeleteRow(row.id, row.words.map(w => w.id))`

**ความเสี่ยง regression:** กลาง — กระทบ undo/history  
**ข้อควรระวัง:** ทดสอบ undo หลังลบแถว; อย่าเปลี่ยน `deleteSubtitleWord` เดิม (ยังใช้กับ Delete key ทีละคำ)

**Checklist หลังแก้:**
- [ ] แถว 3 คำ → กดลบ → หายทั้งแถว
- [ ] Undo คืนแถวได้
- [ ] ลบทีละคำด้วยปุ่ม Delete keyboard ยังทำงาน
- [ ] Unit test ใหม่สำหรับ `deleteSubtitleRow` ผ่าน

---

## Phase 1 — High Priority (Core UX ถูกต้อง)

### Step 1.1 — แก้ URL วิดีโอที่ render แล้ว

| Audit ID | H-01 |
| **ไฟล์** | `frontend/src/components/TranscriptPanel.jsx:664,669` |

**วิธีแก้:**
```js
// ใช้ mediaUrl helper จาก Step 0.1
src={mediaUrl(project.rendered_video)}
href={mediaUrl(project.rendered_video)}
```

**ความเสี่ยง regression:** ต่ำ

**Checklist:**
- [ ] Render สำเร็จ → เปิดโปรเจกต์ใหม่ → แท็บ Media แสดงวิดีโอ render
- [ ] ลิงก์ดาวน์โหลดเปิดไฟล์ MP4 ได้

---

### Step 1.2 — Refresh project หลัง render

| Audit ID | H-02 |
| **ไฟล์** | `frontend/src/hooks/useRender.js` |
| | `frontend/src/hooks/useProjects.js` (เพิ่ม `refreshProject`) |

**วิธีแก้:**
1. เพิ่ม `refreshProject(id)` ใน `useProjects` — `GET /api/project/{id}` แล้ว merge เข้า state
2. หลัง `renderVideo` สำเร็จ เรียก `refreshProject(project.id)`
3. (ทางเลือก) เปิด `result.output_url` ในแท็บใหม่

**ความเสี่ยง regression:** ต่ำ

**Checklist:**
- [ ] Render เสร็จ → แท็บ Media แสดงวิดีโอทันทีโดยไม่ต้อง reopen

---

### Step 1.3 — ปรับ preview words หลัง transcribe

| Audit ID | H-07 |
| **ไฟล์** | `frontend/src/main.jsx`, `frontend/src/hooks/useTranscription.js` |

**วิธีแก้ (เลือกหนึ่ง):**

**ทางเลือก A (แนะนำ):** หลัง transcribe สำเร็จ auto-regroup ตาม `wordsPerLine` ปัจจุบัน
```js
// ใน useTranscription หลัง resetSubtitles(data)
// เรียก regroup ถ้ามี segments
```

**ทางเลือก B:** คืน `wordsPerLine` slicing ใน `getActivePreviewWords(segment, currentTime, wordsPerLine)`

**ความเสี่ยง regression:** กลาง — กระทบ preview/export alignment  
**อย่าแตะ:** logic regroup ที่มี unit test แล้ว

**Checklist:**
- [ ] Transcribe วิดีโอยาว → preview ไม่ล้นกรอบ 9:16
- [ ] เปลี่ยน words/line → preview อัปเดต
- [ ] `npm test` ยังผ่าน 12/12

---

### Step 1.4 — ขยาย loading guard

| Audit ID | H-08 |
| **ไฟล์** | `frontend/src/components/Editor.jsx:120-123` |

**วิธีแก้:**
```js
const anyLoading =
  isLoadingUpload || isLoadingTranscribe || isLoadingRender ||
  isLoading?.autocorrect || isLoading?.repairThai;
```

**ความเสี่ยง regression:** ต่ำ

**Checklist:**
- [ ] ระหว่าง autocorrect ปุ่มสลับโปรเจกต์ disabled
- [ ] ระหว่าง repairThai เช่นกัน

---

### Step 1.5 — ส่ง style ไป ASS export

| Audit ID | H-09 |
| **ไฟล์** | `backend/app/routers/renders.py` |
| | `frontend/src/hooks/useRender.js` |

**วิธีแก้:**
1. เพิ่ม optional body/query `style` ใน export endpoint หรืออ่านจาก `project.settings.style`
2. Frontend ส่ง `style` ปัจจุบันเมื่อ export ASS
3. ส่งต่อเข้า `export_subtitle_file(..., settings)`

**ความเสี่ยง regression:** ต่ำ-กลาง

**Checklist:**
- [ ] Export ASS หลังเปลี่ยน font/color → ไฟล์ ASS สะท้อน style

---

## Phase 2 — Backend Reliability

### Step 2.1 — Soft render ให้สอดคล้อง UI (หรือจำกัด UI)

| Audit ID | H-03 |
| **ไฟล์** | `backend/app/rendering.py` |

**ทางเลือก A:** implement soft render ที่ scale + embed styled ASS  
**ทางเลือก B (เร็ว):** ปิด/disable soft subtitle ใน UI จนกว่าจะพร้อม + tooltip อธิบาย

**ความเสี่ยง regression:** สูงถ้า implement เต็ม — แนะนำ B ก่อน

**Checklist:**
- [ ] ผู้ใช้ไม่เห็นตัวเลือกที่ให้ผลลัพธ์ไม่ตรง preview (ถ้าเลือก B)
- [ ] หรือ soft output มี style ถ้าเลือก A

---

### Step 2.2 — FFmpeg audio-less video + BGM

| Audit ID | H-04 |
| **ไฟล์** | `backend/app/rendering.py:74-87` |

**วิธีแก้:**
1. ใช้ `ffprobe` ตรวจ audio stream (มี `check_video_codec` pattern อยู่แล้ว)
2. ถ้าไม่มี audio: ใช้ `anullsrc` หรือ map BGM เป็น audio เดียว แทน `amix [0:a]`

**ความเสี่ยง regression:** กลาง — ทดสอบทั้งมี/ไม่มี audio

**Checklist:**
- [ ] วิดีโอไม่มีเสียง + BGM → render สำเร็จ
- [ ] วิดีโอมีเสียง + BGM → mix ถูกต้อง

---

### Step 2.3 — Video proxy แบบ async (ไม่บล็อก upload)

| Audit ID | H-06 |
| **ไฟล์** | `routers/projects.py`, `transcription.py` |

**วิธีแก้:**
1. คืน project ทันทีหลัง upload + extract audio
2. รัน `create_video_proxy` ใน background thread/task
3. Frontend แสดงสถานะ "กำลังสร้าง proxy..." (optional)

**ความเสี่ยง regression:** กลาง — preview อาจช้าสำหรับ HEVC ชั่วคราว

**Checklist:**
- [ ] Upload HEVC >50MB คืน response ภายในไม่กี่วินาที
- [ ] Proxy สร้างเสร็จภายหลัง → preview เล่นได้

---

### Step 2.4 — Async jobs สำหรับ transcribe/render (ระยะยาว)

| Audit ID | H-05 |
| **ไฟล์** | ใหม่: `backend/app/jobs.py`, แก้ routers |

**วิธีแก้:**
1. `POST /transcribe` → `{ job_id }`
2. `GET /jobs/{id}` → `{ status, progress, result }`
3. Frontend poll + progress bar + cancel

**ความเสี่ยง regression:** สูง — ทำหลัง Phase 0-1 เสร็จ

---

## Phase 3 — Code Health & UX Polish

### Step 3.1 — จัดการ dead code `InspectorPanel.jsx`

| Audit ID | M-01 |
| **ไฟล์** | `frontend/src/components/InspectorPanel.jsx` |

**วิธีแก้ (เลือกหนึ่ง):**
- **A:** ลบไฟล์ (หลังยืนยันไม่มี import)
- **B:** เก็บไว้แต่ย้ายไป `archive/` + comment ใน README

**อย่า:** merge กลับเข้า Editor โดยไม่วางแผน — มี `CaptionStyleInspector` อยู่แล้ว

---

### Step 3.2 — รวม Export/Render UI จุดเดียว

| Audit ID | M-02 |
| **ไฟล์** | `Editor.jsx`, `CaptionStyleInspector.jsx` |

**วิธีแก้:** เก็บ export/render ใน `CaptionStyleInspector` tab เท่านั้น ลบ dropdown ซ้ำใน topbar (หรือเก็บแค่ shortcut เดียว)

---

### Step 3.3 — `setLoading('export')` ใน export flow

| Audit ID | M-03 |
| **ไฟล์** | `useRender.js` |

**วิธีแก้:** wrap `exportSubtitles` ด้วย `setLoading('export', true/false)` ใน try/finally

---

### Step 3.4 — Media URL helper ใช้ทั่วโปรเจกต์

| Audit ID | M-04, H-01 |
| **ไฟล์** | `api.js`, `PreviewPanel.jsx`, `Landing.jsx`, `TranscriptPanel.jsx`, `SubtitleExpandedEditor.jsx` |

**วิธีแก้:** แทนที่ string concat ซ้ำๆ ด้วย `mediaUrl()`

---

### Step 3.5 — แก้ dev scripts path

| Audit ID | M-09 |
| **ไฟล์** | `run-dev.bat`, `run-backend-8100.bat`, `check-dev.bat` |

**วิธีแก้:** ใช้ `%~dp0` แทน hardcode path:
```bat
cd /d "%~dp0backend"
```

---

### Step 3.6 — ปรับ `apiRequest` error message

| Audit ID | M-13 |
| **ไฟล์** | `frontend/src/api.js` |

**วิธีแก้:**
```js
const detail = typeof payload === 'object' && payload?.detail
  ? (Array.isArray(payload.detail) ? payload.detail.map(d => d.msg || JSON.stringify(d)).join('; ') : payload.detail)
  : payload;
```

---

### Step 3.7 — `beforeunload` + autosave coordination

| Audit ID | M-06, M-07 |
| **ไฟล์** | `Editor.jsx`, `useAutosave.js` |

**วิธีแก้:**
- แจ้งเตือนเมื่อ `isDirty && saveStatus !== 'saving'`
- พิจารณา flush save ก่อน unload (optional)

---

## Phase 4 — Security & Low Priority

| Step | Audit ID | งาน | ไฟล์ |
|------|----------|-----|------|
| 4.1 | L-08 | ย้าย Gemini key จาก query string → header | `routers/transcription.py`, `extension/popup.js` |
| 4.2 | L-09 | ระบุใน README ว่า API ไม่มี auth — localhost only | `README.md` |
| 4.3 | L-07 | LRU evict สำหรับ `_MODEL_CACHE` | `transcription.py` |
| 4.4 | L-02 | ลบ `requests` จาก requirements ถ้าไม่ใช้ | `requirements.txt` |
| 4.5 | L-05 | Toast component แยก type success/error | ใหม่ `Toast.jsx`, `main.jsx` |
| 4.6 | M-08 | จับ `ValueError` จาก corrupt project → 422 | `routers/projects.py` |

---

## ลำดับ Sprint แนะนำ

```
Sprint 1 (1-2 วัน) — Unblock
├── Step 0.1  BGM upload fix
├── Step 0.2  Delete row fix + unit test
├── Step 1.1  Rendered video URL
└── Regression Phase 0 checklist

Sprint 2 (2-3 วัน) — UX ถูกต้อง
├── Step 1.2  Refresh after render
├── Step 1.3  Preview/regroup after transcribe
├── Step 1.4  Loading guards
├── Step 3.4  mediaUrl helper
└── Regression Phase 1 checklist

Sprint 3 (3-5 วัน) — Backend quality
├── Step 1.5  ASS export style
├── Step 2.2  Audio-less + BGM
├── Step 2.1  Soft render (หรือ disable UI)
└── Step 2.3  Async proxy

Sprint 4 (ตามความจำเป็น)
├── Step 2.4  Job queue
├── Step 3.1-3.3  Dead code + UI dedup
└── Phase 4 security/low items
```

---

## Master Regression Checklist (รันหลังทุก Sprint)

### Core Flow
- [ ] อัปโหลด MP4 → โปรเจกต์สร้าง + `audio/source.wav` มี
- [ ] Preload Whisper (`small/cpu/int8`)
- [ ] ถอดเสียงไทย → segments + words ไม่ว่าง
- [ ] แก้คำ → autosave / Ctrl+S → reload แล้วคงอยู่
- [ ] Undo / Redo
- [ ] คลิก timeline → seek ถูกต้อง
- [ ] แยกซับ (scissors) ทำงาน
- [ ] Words/line regroup
- [ ] ลบแถว transcript ลบครบทุกคำ
- [ ] Export SRT / VTT / ASS / TXT ดาวน์โหลดได้
- [ ] Render hard → MP4 + preview ใน Media tab
- [ ] อัปโหลด BGM จาก Media tab → เล่น preview → render พร้อม BGM
- [ ] ลบโปรเจกต์ → สำเร็จ

### Error Paths
- [ ] ปิด backend → action แสดง error ชัด ไม่ toast สำเร็จ
- [ ] ไฟล์ >500MB → reject ทั้ง frontend และ backend
- [ ] Gemini ไม่มี key → error 400 ชัดเจน
- [ ] วิดีโอไม่มีเสียง → transcribe แจ้ง error ที่เข้าใจได้

### Automated
- [ ] `npm test` — 12+ tests pass
- [ ] `npm run build` — ผ่าน
- [ ] `python -m compileall backend/app` — ผ่าน

### Extension
- [ ] Health check Connected
- [ ] Fetch → correct → save subtitles
- [ ] API key ผิด → error message ใน popup

---

## กฎสำหรับ Senior Engineer

1. **ห้ามแก้หลาย phase พร้อมกันใน PR เดียว** — แยก PR ตาม Sprint
2. **ห้ามลบฟังก์ชันที่ทำงาน** — refactor แบบ additive ก่อน
3. **ทุก bug fix ควรมี test หรือ manual step ใน checklist**
4. **อย่าแก้ `InspectorPanel.jsx` โดยไม่ตัดสินใจ dead code ก่อน** (Step 3.1)
5. **อย่าเปลี่ยน API contract โดยไม่ sync frontend + extension**
6. **Commit message อธิบาย why** — อ้าง Audit ID (เช่น `fix(C-01): BGM upload endpoint mismatch`)

---

*แผนนี้สอดคล้องกับ [`PROJECT_AUDIT.md`](./PROJECT_AUDIT.md) — อัปเดตเมื่อแก้เสร็จแต่ละขั้น*
