# FASTSUB — แผนแก้ไขและพัฒนาสำหรับ Senior Engineer

> **เอกสารนี้จัดทำจากการตรวจสอบโค้ดเบส ณ วันที่ 6 ก.ค. 2026**  
> ใช้เป็นคำสั่งงาน (work order) สำหรับ Senior Engineer ในการแก้ไข UX/UI, ฟังก์ชันปุ่ม, Backend และความเสถียรของระบบ  
> อ้างอิงเอกสารเดิม: `fixbugimpementplan.md`, `FASTSUB_QUALITY_AUDIT_REPORT.md`

---

## สรุปภาพรวม

**FASTSUB** คือโปรแกรมแก้ไขซับไตเติ้ลภาษาไทยแบบ local-first ประกอบด้วย:

| ส่วน | เทคโนโลยี | พอร์ต |
|------|-----------|-------|
| Frontend | React 19 + Vite 6 | `http://localhost:5173` |
| Backend | FastAPI + Faster-Whisper + FFmpeg | `http://localhost:8100` |
| Extension | Chrome MV3 (Gemini correction) | — |

### สิ่งที่ทำงานได้แล้ว (Baseline ที่ต้องไม่พัง)

- อัปโหลดวิดีโอ → สร้างโปรเจกต์ + extract audio
- ถอดเสียงด้วย Whisper (พร้อมตั้งค่า model/device จาก toolbar)
- แก้ไขคำทีละ word, undo/redo, autosave (debounce 3 วินาที)
- Export ซับ (SRT / VTT / ASS / TXT)
- Render hard subtitle (burn-in) พร้อม style + BGM
- อัปโหลด BGM และส่งไป render
- Keyboard shortcuts: `Ctrl+S`, `Ctrl+Z`, `Ctrl+Y`, `Space`, `Delete`
- Chrome Extension เชื่อมต่อ Gemini correction

### คะแนนคุณภาพโดยรวม (ประเมินจากการตรวจสอบ)

| หมวด | สถานะ | หมายเหตุ |
|------|--------|----------|
| Core workflow (upload → transcribe → edit → export) | ✅ ใช้งานได้ | ต้องแก้ delete + loading state |
| UX/UI ความสมบูรณ์ | ⚠️ ~40% | ปุ่มหลายตัวเป็น stub / disabled |
| ความตรงกัน UI ↔ Backend | ⚠️ ~50% | translate, words-per-line, style persistence |
| ความเสถียรระยะยาว | ⚠️ ปานกลาง | sync HTTP, ไม่มี progress/cancel |

---

## Phase 0 — แก้บั๊ก Critical (ทำก่อนทุกอย่าง)

### P0-1: ลบโปรเจกต์ล้มเหลว — `NameError: project_dir`

**ความรุนแรง:** Critical  
**ไฟล์:** `backend/app/main.py` บรรทัด 153–163

**ปัญหา:** Endpoint `DELETE /api/project/{id}` เรียก `project_dir()` แต่ไม่ได้ import จาก `storage.py`

```python
# ปัจจุบัน (บรรทัด 11) — ไม่มี project_dir
from .storage import BASE_DIR, STORAGE_DIR, create_project, get_project, ...

# บรรทัด 158 — เรียกใช้ project_dir โดยไม่มี import
folder = project_dir(project_id)
```

**วิธีแก้:**
```python
from .storage import BASE_DIR, STORAGE_DIR, create_project, get_project, get_subtitles,
    list_projects, project_dir, save_project, save_project_asset, save_subtitles
```

**Acceptance test:**
1. สร้างโปรเจกต์ใหม่ → เลือกจาก dropdown ลบ → กด "ลบ"
2. ต้องได้ `200` และโฟลเดอร์ `backend/storage/projects/{id}/` ถูกลบ
3. รีเฟรชรายการโปรเจกต์ — โปรเจกต์หายจาก list

---

## Phase 1 — แก้ฟังก์ชันปุ่มและ UX ที่ทำให้ผู้ใช้เข้าใจผิด

### P1-1: คำ/บรรทัด (Words Per Line) — ข้อความหลอก

**ความรุนแรง:** High  
**ไฟล์:**
- `frontend/src/components/TranscriptPanel.jsx:98`
- `frontend/src/subtitleUtils.js:8-16`
- `frontend/src/main.jsx:363-368`

**ปัญหา:** ข้อความ "จัดซับใหม่เป็น X คำต่อข้อความแล้ว" ทำให้ผู้ใช้คิดว่าระบบ regroup segment แล้ว แต่จริงๆ เปลี่ยนแค่ **การ slice คำใน preview** (`getActivePreviewWords`) ไม่ได้เปลี่ยนโครงสร้าง segment หรือ timing group

**ทางเลือกแก้ไข (เลือกอย่างใดอย่างหนึ่ง):**

| ทางเลือก | งาน | ผลลัพธ์ |
|----------|-----|---------|
| A (เร็ว) | เปลี่ยนข้อความเป็น "แสดง X คำต่อบรรทัดในพรีวิว" | ลดความเข้าใจผิด |
| B (เต็ม) | สร้าง `regroupWords(segments, wordsPerLine)` บันทึก line groups จริง | ตรงกับ UX ที่โฆษณา |

**Acceptance test (ทางเลือก B):**
- สลับ 1 / 3 / 5 คำต่อบรรทัด → preview และ export สะท้อน grouping ใหม่
- บันทึกแล้ว reload — ค่า `words_per_line` และ grouping คงอยู่

---

### P1-2: แปลภาษา (Translation) — Stub ไม่ใช่การแปลจริง

**ความรุนแรง:** High  
**ไฟล์:**
- `backend/app/main.py:177-184`
- `frontend/src/components/InspectorPanel.jsx:59-71`

**ปัญหา:**
1. Backend แค่ prefix `[English]` หน้าข้อความ ไม่ได้แปลจริง
2. **ไม่เรียก `save_subtitles()`** — แปลแล้วหายเมื่อ reload
3. Frontend แสดง toast สำเร็จทั้งที่ผลลัพธ์ไม่ถูกต้อง

**วิธีแก้:**
1. เชื่อม Gemini / Google Translate API จริง (หรือซ่อนแท็บจนกว่าจะพร้อม)
2. เรียก `save_subtitles(translated)` หลังแปลสำเร็จ
3. ถ้ายังเป็น stub — ปิดปุ่มและแสดง badge "เร็วๆ นี้"

**Acceptance test:**
- แปล EN → ข้อความเป็นภาษาอังกฤษจริง (ไม่ใช่ `[English] ...`)
- Reload โปรเจกต์ → ข้อความที่แปลยังอยู่

---

### P1-3: ตรวจคำอัตโนมัติ (Autocorrect) — Local mode หลอก

**ความรุนแรง:** High  
**ไฟล์:**
- `backend/app/main.py:166-174`
- `frontend/src/components/TranscriptPanel.jsx:66-82`

**ปัญหา:**
- โหมด `local` ทำแค่ trim + join ช่องว่าง ไม่ได้แก้สะกดคำ
- เลือก Gemini แต่ไม่ใส่ API key → fallback เป็น local โดยไม่แจ้งเตือน
- `autocorrect` ไม่เรียก `_require_project()` — อาจทำงานกับ project ที่ไม่มี

**วิธีแก้:**
1. เปลี่ยนชื่อปุ่ม local เป็น "จัดระเบียบช่องว่าง" (มี option นี้แล้ว แต่ปุ่มหลักยังเขียน "ตรวจคำอัตโนมัติ")
2. ถ้าเลือก Gemini แต่ไม่มี key → แสดง error ก่อนเรียก API
3. เพิ่ม `_require_project(project_id)` ใน autocorrect endpoint
4. เพิ่มปุ่ม "ซ่อมคำไทย" เรียก `POST /api/project/{id}/subtitles/repair-thai-words` (มี backend แล้ว ไม่มี UI)

---

### P1-4: ไม่มี Loading State — กดซ้ำได้ระหว่างรอ

**ความรุนแรง:** High  
**ไฟล์:** `frontend/src/main.jsx:170-272`, `frontend/src/components/Editor.jsx`

**ปัญหา:** upload, transcribe, render, autocorrect ไม่ disable ปุ่มระหว่างทำงาน → ผู้ใช้กดซ้ำได้ → duplicate request / state ผิด

**วิธีแก้:**
1. เพิ่ม state `isLoading: { upload, transcribe, render, autocorrect }`
2. Disable ปุ่มที่เกี่ยวข้อง + แสดง spinner/progress text
3. สำหรับ transcribe/render ระยะยาว — พิจารณา job queue + polling (Phase 3)

**Acceptance test:**
- กด "ถอดเสียง" → ปุ่ม disabled จนกว่าจะเสร็จ
- กดซ้ำระหว่างรอ → ไม่เกิด request ซ้ำ

---

### P1-5: Fetch โปรเจกต์/ซับไม่ผ่าน `apiRequest` — ไม่เช็ค error

**ความรุนแรง:** High  
**ไฟล์:** `frontend/src/main.jsx:53-59`, `67-78`

**ปัญหา:**
- `refreshProjects()` และโหลด subtitles ใช้ `fetch` ตรงๆ ไม่เช็ค `response.ok`
- ถ้า backend คืน 500 → error object อาจถูก set เป็น subtitles state
- Race condition: สลับโปรเจกต์เร็ว → response เก่าทับโปรเจกต์ใหม่

**วิธีแก้:**
1. ใช้ `apiRequest()` ทุกจุด
2. ใช้ `AbortController` ยกเลิก fetch เมื่อ `project` เปลี่ยน
3. `openProject()` — clear `subtitles` ทันทีก่อน fetch

---

## Phase 2 — UX/UI และความสมบูรณ์ของหน้าจอ

### P2-1: ปุ่ม Disabled จำนวนมาก — ต้องจัดหมวดหมู่ชัดเจน

**ความรุนแรง:** Medium–High (UX)  
**ไฟล์ที่เกี่ยวข้อง:**

| ตำแหน่ง | ปุ่ม/คอนโทรล | สถานะ |
|---------|--------------|--------|
| `Landing.jsx:29-41` | เพจหลัก, FASTSUB Local/Studio | disabled stub |
| `Landing.jsx:77-78` | YouTube URL | disabled stub |
| `Landing.jsx:81-92` | ภาษาเสียง, สัดส่วน, โหมดซับ | **decorative** — `defaultValue` ไม่ส่งไป upload |
| `Editor.jsx:215-217` | nav chips | disabled stub |
| `TranscriptPanel.jsx:46,96` | เพิ่มเวิร์ด, โหมดแบ่งคำ | disabled stub |
| `TimelinePanel.jsx:16-20` | ตัด/เชื่อม/เพิ่ม/ซูม | disabled stub |
| `PreviewPanel.jsx:96` | เต็มจอ | disabled stub |
| `InspectorPanel.jsx:167-170,239` | SFX, ปลั๊กอิน | disabled stub — ไม่มี backend |

**คำแนะนำ Senior Engineer:**

1. **ซ่อนหรือย้ายไป "Coming Soon"** สำหรับฟีเจอร์ที่ยังไม่ทำ — อย่าแสดงปุ่ม disabled จำนวนมายาวๆ
2. **Landing settings** — ถ้ายังไม่ wire ให้ลบออก หรือ bind กับ `whisperSettings` / `renderOptions` จริง
3. **Hero copy** บอก "ซาวด์เอฟเฟกต์" แต่ SFX ยังไม่ทำงาน → แก้ copy หรือทำ SFX ให้เสร็จ

---

### P2-2: Style Preset ไม่ครบ — Preview กับ Render ไม่ตรงกัน

**ความรุนแรง:** Medium  
**ไฟล์:**
- `frontend/src/styles.css:729-744` — มี CSS เฉพาะ `creator`, `boxed`
- `InspectorPanel.jsx:80-87` — มี preset `neon`, `minimal` แต่ไม่มี style
- `frontend/src/main.jsx:26` — `style` ไม่ persist ลง project
- `backend/app/rendering.py` — soft render ไม่ใช้ style/BGM/resolution

**วิธีแก้:**
1. เพิ่ม CSS สำหรับ `neon`, `minimal` หรือลบออกจาก UI
2. บันทึก `style` ลง `project.json` หรือ `subtitles.json`
3. Soft subtitle render: ใช้ resolution + embed track ให้สอดคล้องกับ hard render มากขึ้น

---

### P2-3: Timeline แสดง "Segment 1" ตายตัว

**ความรุนแรง:** Low  
**ไฟล์:** `frontend/src/components/TimelinePanel.jsx:49`

**วิธีแก้:** แสดง segment index จริงจาก `activeSegment` หรือจำนวน segments ทั้งหมด

---

### P2-4: Duration floor 22 วินาที — timeline ผิดสำหรับคลิปสั้น

**ความรุนแรง:** Medium  
**ไฟล์:** `frontend/src/main.jsx:85-87`

```javascript
return Math.max(22, ...allWords.map(...));
```

**วิธีแก้:** ใช้ `videoRef.current.duration` หรือ metadata จาก project แทน hardcode 22

---

### P2-5: Toast และ Feedback

**ความรุนแรง:** Medium  
**ไฟล์:** `frontend/src/main.jsx:377`, `Landing.jsx:18-20`

**ปัญหา:**
- Toast เป็น `<button>` ไม่มี success/error color
- ลบโปรเจกต์ใช้ `alert()` / `confirm()` แทน in-app modal
- ไม่มี aria-live สำหรับ screen reader

**วิธีแก้:**
1. สร้าง `Toast` component พร้อม type (success / error / info)
2. แทนที่ `alert` ด้วย toast + confirm dialog component
3. เพิ่ม `role="status"` / `aria-live="polite"`

---

### P2-6: ภาษา UI ปนกัน (ไทย/อังกฤษ)

**ความรุนแรง:** Low  
**ตัวอย่าง:** "Transcript", "Render Video", "Subtitle type", `html lang="en"`

**วิธีแก้:** กำหนด i18n policy — ไทยทั้งหมด หรือ EN ทั้งหมด แล้วทำให้สม่ำเสมอ

---

## Phase 3 — Backend และความเสถียรระยะยาว

### P3-1: Transcribe / Render เป็น Synchronous HTTP

**ความรุนแรง:** High (สำหรับวิดีโอยาว)  
**ไฟล์:** `backend/app/main.py:97-110`, `transcription.py`, `rendering.py`

**ปัญหา:** Request ค้างจนเสร็จ → timeout, UI ค้าง, ไม่มี cancel

**วิธีแก้ (แนะนำ):**
1. สร้าง job model (`job_id`, `status`, `progress`, `message`)
2. `POST /transcribe` → คืน `job_id` ทันที
3. `GET /jobs/{id}` → poll progress
4. Frontend แสดง progress bar + ปุ่มยกเลิก

---

### P3-2: Validation ที่ขาด

**ความรุนแรง:** Medium  
**ไฟล์:** `backend/app/main.py`

| จุด | ปัญหา | แก้ไข |
|-----|--------|-------|
| Upload | ไม่เช็ค MIME/size | จำกัดขนาด + ตรวจนามสกุล |
| Save subtitles | ไม่ validate timing | ตรวจ start < end, ไม่ overlap ผิดปกติ |
| Gemini autocorrect | ไม่ guard `candidates` | try/except + error message ชัดเจน |

---

### P3-3: Security (สำหรับ local app)

**ความรุนแรง:** Medium (ถ้า expose นอก localhost)

| ประเด็น | ไฟล์ | แนะนำ |
|---------|------|-------|
| ไม่มี auth | `main.py` | OK สำหรับ localhost เท่านั้น — ระบุใน README |
| `/media` expose ทั้ง BASE_DIR | `main.py:30-31` | จำกัด path ให้เฉพาะ `storage/projects/` |
| Gemini key ใน URL query | `main.py:202` | ส่ง key ใน header แทน |
| API key ใน localStorage | `TranscriptPanel.jsx:8-12` | พิจารณา env var หรือ secure storage |

---

### P3-4: Chrome Extension — Error handling

**ความรุนแรง:** Medium  
**ไฟล์:** `extension/popup.js:24-43`

**ปัญหา:**
- ไม่มี `try/catch` รอบ flow หลัก
- Fetch subtitles ไม่เช็ค `response.ok`
- Gemini error แสดงแค่ status code

**วิธีแก้:** ห่อทั้ง flow ใน try/catch, ใช้ pattern เดียวกับ frontend `apiRequest`

---

## Phase 4 — ฟีเจอร์ที่ยังไม่ implement (ตัดสินใจก่อนลงมือ)

| ฟีเจอร์ | Backend | Frontend | คำแนะนำ |
|---------|---------|----------|---------|
| YouTube URL import | ❌ | disabled UI | ตัดออกจาก MVP หรือทำ yt-dlp integration |
| SFX | ❌ | UI only | ซ่อนแท็บ SFX จนกว่าจะมี asset library + render pipeline |
| Timeline edit (ตัด/เชื่อม/เพิ่ม) | บางส่วน | disabled | ทำทีละ action พร้อม undo |
| เพิ่มเวิร์ด / โหมดแบ่งคำ | บางส่วน | disabled | เชื่อมกับ word-level model |
| Plugin rail | ❌ | disabled | ลบออกจาก UI |
| Fullscreen preview | ❌ | disabled | ใช้ Fullscreen API ง่าย — ทำได้เร็ว |

---

## ลำดับการทำงานที่แนะนำ (Sprint Plan)

```
Sprint 1 (1-2 วัน) — Unblock core
├── P0-1  Fix delete project import
├── P1-4  Loading states ทุก primary action
├── P1-5  Unified apiRequest + AbortController
└── Regression: upload → transcribe → edit → save → delete

Sprint 2 (2-3 วัน) — แก้ความเข้าใจผิด
├── P1-1  Words per line (ทางเลือก A หรือ B)
├── P1-2  Translation (จริง หรือซ่อน)
├── P1-3  Autocorrect labels + project guard + repair-thai UI
└── P2-5  Toast component แทน alert

Sprint 3 (3-5 วัน) — UX polish
├── P2-1  จัดหมวด disabled controls / landing settings
├── P2-2  Style persistence + preset CSS
├── P2-4  Duration จาก video metadata
└── P2-6  i18n consistency

Sprint 4 (5+ วัน) — Scale & harden
├── P3-1  Async jobs สำหรับ transcribe/render
├── P3-2  Upload/subtitle validation
├── P3-3  Media path hardening
└── P3-4  Extension error handling
```

---

## Regression Test Checklist (ต้องผ่านก่อน merge แต่ละ sprint)

### Core Flow
- [ ] อัปโหลด MP4 ใหม่ → โปรเจกต์ปรากฏใน list
- [ ] ตรวจว่า `audio/source.wav` ถูกสร้าง
- [ ] Preload Whisper (`small` / `cpu` / `int8`)
- [ ] ถอดเสียงภาษาไทย → ได้ `segments` และ `words` ไม่ว่าง
- [ ] แก้คำ → autosave หรือ Ctrl+S → reload แล้วคำยังอยู่
- [ ] Undo / Redo ทำงาน
- [ ] คลิก timeline → seek วิดีโอถูกต้อง
- [ ] Export SRT / VTT / ASS → เปิดไฟล์ได้
- [ ] Render hard subtitle → ได้ MP4 พร้อมซับ burn-in
- [ ] อัปโหลด BGM → render พร้อมเสียงประกอบ
- [ ] **ลบโปรเจกต์ → สำเร็จ ไม่ error 500**

### Error Paths
- [ ] ปิด backend → กดถอดเสียง → แสดง error ชัดเจน ไม่ toast สำเร็จ
- [ ] Backend คืน 500 → UI ไม่เอา error JSON มาแสดงเป็นซับ
- [ ] กดถอดเสียงซ้ำระหว่างรอ → ไม่ duplicate

### Extension
- [ ] Extension เชื่อมต่อ `localhost:8100` ได้
- [ ] Fetch + correct + save subtitles สำเร็จ
- [ ] Gemini key ผิด → แสดง error

---

## ไฟล์อ้างอิงสำคัญ

| ไฟล์ | บทบาท |
|------|--------|
| `frontend/src/main.jsx` | App state, API orchestration, autosave |
| `frontend/src/api.js` | `apiRequest` helper |
| `frontend/src/components/*.jsx` | UI แต่ละ panel |
| `backend/app/main.py` | API routes ทั้งหมด |
| `backend/app/storage.py` | Project persistence |
| `backend/app/rendering.py` | FFmpeg render pipeline |
| `backend/app/transcription.py` | Whisper transcription |
| `extension/popup.js` | Gemini bridge |
| `fixbugimpementplan.md` | แผนเดิม + สถานะบางรายการแก้แล้ว |

---

## หมายเหตุสำหรับ Senior Engineer

1. **อย่าแก้ทุกอย่างพร้อมกัน** — Sprint 1 ต้องผ่าน regression ก่อนไป Sprint 2
2. **Stub features** — ถ้ายังไม่ทำ ให้ซ่อน UI ดีกว่าแสดง disabled ยาวๆ (ลด confusion)
3. **เอกสาร `fixbugimpementplan.md`** บางรายการแก้แล้ว (apiRequest, component split, BGM upload, keyboard shortcuts) — อย่าแก้ซ้ำ
4. **`FASTSUB_QUALITY_AUDIT_REPORT.md`** คะแนน 38/100 เป็นฐานเก่า — ใช้เป็น reference ไม่ใช่ source of truth
5. **ไม่ commit `.env` หรือ API keys** — Gemini key ต้องไม่อยู่ใน repo

---

*จัดทำโดย: Code audit อัตโนมัติจากโค้ดเบส FASTSUB*  
*สำหรับคำถามเชิงเทคนิค: ดู `README.md` และ `fixbugimpementplan.md`*
