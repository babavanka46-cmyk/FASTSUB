# 🔴 AUDIT REPORT: ปัญหาจอว่างเมื่ออัพโหลดวีดีโอใหญ่ (≥50MB) + ปัญหา UX/UI ที่พบทั้งหมด

> **วันที่ตรวจสอบ:** 2026-07-07
> **ไฟล์ตัวอย่างที่พบปัญหา:** `C:\Users\ARRAY\Downloads\วีดีโอร้านขนมตาล01.mp4` (~80MB)
> **อาการ:** อัพโหลดวีดีโอ ~80MB แล้วหน้าจอว่างเปล่า / จอดำ ในขณะที่วีดีโอขนาดเล็กทำงานปกติ
> **คำตอบสั้น:** **ยังไม่พร้อมให้ user ใช้งานจริง** ต้องแก้ปัญหาวิกฤต (P0) อย่างน้อย 3 จุดก่อน

---

## 📋 สารบัญ

1. [สรุปผู้บริหาร (สำหรับคนไม่มีความรู้ code)](#1-สรุปผู้บริหาร)
2. [สาเหตุราก (Root Causes) พร้อมตำแหน่งในโค้ด](#2-สาเหตุราก-root-causes)
3. [ปัญหาทั้งหมดที่พบ แยกระดับความรุนแรง](#3-ปัญหาทั้งหมดที่พบ)
4. [คำสั่งการแก้ไขสำหรับ IDE (Actionable Fix Spec)](#4-คำสั่งการแก้ไขสำหรับ-ide)
5. [เกณฑ์การทดสอบว่าแก้เสร็จ (Acceptance Criteria)](#5-เกณฑ์การทดสอบ)

---

## 1. สรุปผู้บริหาร

โปรแกรม FASTSUB **มีบั๊กวิกฤต** ที่ทำให้วีดีโอขนาดใหญ่ (ตั้งแต่ 50MB ขึ้นไป) ใช้งานไม่ได้ สาเหตุมาจาก:

- **ระบบ "Proxy" (ไฟล์วีดีโอสำรอง) มี Race Condition:** โปรแกรมสร้างไฟล์วีดีโอสำรองในพื้นหลัง แต่เช็คแค่ว่า "ไฟล์มีอยู่หรือไม่" โดยไม่เช็คว่า "ไฟล์สร้างเสร็จหรือยัง" → เบราว์เซอร์ได้ไฟล์ครึ่งๆ กลางๆ → เล่นไม่ได้ → **จอว่าง**
- **ไม่รองรับวีดีโอ HEVC (iPhone/สมาร์ทโฟนใหม่):** ก่อนไฟล์สำรองสร้างเสร็จ เบราว์เซอร์พยายามเล่นไฟล์ต้นฉบับที่มันเล่นไม่ได้ → **จอดำ**
- **ไม่มีการแจ้งเตือนเมื่อเกิดข้อผิดพลาด:** แท็กวีดีโอไม่มี `onError` เลย เมื่อโหลดไม่ได้ผู้ใช้ไม่รู้ว่าเกิดอะไรขึ้น เห็นแค่จอว่าง

นอกจากนี้ยังมีปัญหา UX/UI อีกหลายจุด เช่น ไม่มี progress bar ระหว่างอัพโหลด, Toast แจ้งเตือนแบบง่ายๆ, ปุ่ม "นำเข้า" ซ้อนทับเมนู ฯลฯ (ดูหมวด 3)

**สรุป:** 🛑 **ยังไม่ควรให้ user ใช้งานจริง** ต้องแก้ P0 ก่อนอย่างน้อย 3 จุด

---

## 2. สาเหตุราก (Root Causes)

### 🔴 ROOT CAUSE #1: Race Condition ในการสร้าง Proxy (วิกฤตสุด)

**ตำแหน่ง:** `backend/app/transcription.py:278-313` + `backend/app/main.py:39-49`

**วิธีที่เกิดปัญหา:**

```
เส้นเวลา (Timeline) เมื่ออัพโหลดวีดีโอ 80MB:

เวลา 0s   : อัพโหลดเสร็จ → backend ส่ง project กลับ → frontend เปิดหน้า Editor
เวลา 0.1s : backend เริ่มสร้าง proxy (background task) ด้วย ffmpeg
เวลา 0.2s : ffmpeg เริ่มเขียนไฟล์ source_proxy.mp4 (ไฟล์มีอยู่แล้ว แต่ยังไม่ครบ!)
เวลา 0.3s : เบราว์เซอร์ขอเล่นวีดีโอ → backend เช็ค proxy_path.exists() = True
            → ส่งไฟล์ proxy ที่ยังเขียนไม่เสร็จให้เบราว์เซอร์
เวลา 0.4s : เบราว์เซอร์ได้ MP4 ที่ถูกตัดกลางคัน → เล่นไม่ได้ → จอว่าง/ดำ ❌
เวลา 30s  : ffmpeg สร้าง proxy เสร็จ แต่เบราว์เซอร์ล้มเลิกไปแล้ว ไม่โหลดใหม่
```

**โค้ดที่มีปัญหา — `backend/app/transcription.py:290-292`:**
```python
proxy_output = source_path.parent / "source_proxy.mp4"
if proxy_output.exists():   # ❌ BUG: ไฟล์ exists แต่อาจยังเขียนไม่เสร็จ
    return True
```

**โค้ดที่มีปัญหา — `backend/app/main.py:46-49`:**
```python
proxy_path = file_path.parent / "source_proxy.mp4"
if proxy_path.exists():     # ❌ BUG: เดียวกัน ไม่เช็คว่าสร้างเสร็จหรือยัง
    file_path = proxy_path
```

**ทำไมวีดีโอเล็กไม่มีปัญหา:** ใน `transcription.py:285` เงื่อนไขคือ `file_size_mb > 50.0` → วีดีโอ <50MB ไม่สร้าง proxy เลย → ไม่มี race condition

---

### 🔴 ROOT CAUSE #2: ไม่รองรับ HEVC/H.265 ในช่วง "ก่อน proxy พร้อม"

**ตำแหน่ง:** `frontend/src/components/PreviewPanel.jsx:306-313`, `frontend/src/components/Landing.jsx:36-47`

- สมาร์ทโฟนสมัยใหม่ (iPhone เกือบทุกรุ่น, Android บางรุ่น) ถ่ายวีดีโอเป็น **HEVC/H.265** เป็นค่าเริ่มต้น
- เบราว์เซอร์ (Chrome/Edge/Firefox) **เล่น HEVC ไม่ได้** (ยกเว้น Safari บางเวอร์ชัน)
- ระหว่างที่รอ proxy (H.264) สร้างเสร็จ เบราว์เซอร์ได้ไฟล์ HEVC ต้นฉบับ → เล่นไม่ได้ → **จอดำ/ว่าง**

**โค้ดที่ขาด — `PreviewPanel.jsx:306` ไม่มี `onError`:**
```jsx
<video
  ref={videoRef}
  src={src}
  // ❌ ไม่มี onError={...} เลย → เมื่อโหลดไม่ได้ ผู้ใช้ไม่รู้
  onTimeUpdate={...}
  onLoadedMetadata={...}
/>
```

---

### 🔴 ROOT CAUSE #3: `extract_audio()` บล็อก HTTP Response (ทำให้ดูเหมือนค้าง)

**ตำแหน่ง:** `backend/app/routers/projects.py:46`

```python
@router.post("/api/projects/upload", response_model=Project)
async def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)) -> Project:
    ...
    project = create_project(...)
    background_tasks.add_task(create_video_proxy, ...)   # ✅ อันนี้เป็น background (ดี)
    try:
        audio_path = extract_audio(project.id, project.source_video)  # ❌ SYNCHRONOUS! บล็อก!
    except TranscriptionError as exc:
        ...
```

- `extract_audio()` รัน ffmpeg แบบ **synchronous** (รอจนเสร็จ) ภายใน request
- สำหรับวีดีโอ 80MB อาจใช้เวลา **10–60 วินาที** (ขึ้นกับความยาว + CPU)
- ตลอดเวลานั้น frontend แสดง "กำลังอัปโหลด..." ทั้งที่อัพโหลดเสร็จแล้ว แค่รอสกัดเสียง → **ผู้ใช้คิดว่าโปรแกรมค้าง**

---

## 3. ปัญหาทั้งหมดที่พบ

### 🔴 ระดับ P0 (วิกฤต — ต้องแก้ก่อนให้ user ใช้)

| # | ปัญหา | ตำแหน่ง | รายละเอียด |
|---|---|---|---|
| P0-1 | Race condition ไฟล์ proxy | `backend/app/transcription.py:290` + `backend/app/main.py:47` | เช็ค `.exists()` แต่ไม่เช็คว่าเขียนเสร็จ → เบราว์เซอร์ได้ไฟล์ครึ่งๆ |
| P0-2 | `<video>` ไม่มี `onError` handler | `PreviewPanel.jsx:306`, `Landing.jsx:36` | โหลดไม่ได้ก็เงียบ → จอว่างโดยไม่แจ้ง |
| P0-3 | `extract_audio` synchronous บล็อก response | `backend/app/routers/projects.py:46` | วีดีโอใหญ่รอนาน → ดูเหมือนค้าง |
| P0-4 | ไม่มีสัญญาณว่า proxy พร้อม | ทั้งระบบ | Frontend ไม่รู้ว่าต้องรอ proxy → โหลดทันทีแล้วพัง |

### 🟡 ระดับ P1 (สำคัญ — UX แย่มาก)

| # | ปัญหา | ตำแหน่ง | รายละเอียด |
|---|---|---|---|
| P1-1 | ไม่มี progress bar อัพโหลด | `frontend/src/hooks/useProjects.js:120` + `frontend/src/api.js:10` | `fetch()` ไม่รองรับ progress → ไฟล์ใหญ่ไม่รู้ความคืบหน้า |
| P1-2 | Toast แจ้งเตือนแบบง่ายๆ ไม่มีประเภท | `frontend/src/components/Toast.jsx` | แค่ `<button>` เดียว ไม่แยก error/warning/info ไม่มี auto-dismiss |
| P1-3 | ไม่มี timeout บน API request | `frontend/src/api.js:10-23` | ถ้า backend ค้างนาน frontend รอเงียบๆ ไม่มีที่สิ้นสุด |
| P1-4 | `job thread pool` มีแค่ 2 workers | `backend/app/jobs.py:14` | ถ้า user ทำงานหนัก 2 งานพร้อมกัน งานที่ 3 จะค้าง |
| P1-5 | ปุ่ม "นำเข้า" ใน Editor ซ่อนอยู่ใน topbar | `frontend/src/components/Editor.jsx:233-236` | UX สับสน ควรมีใน sidebar/เมนูชัดเจน |

### 🟢 ระดับ P2 (ควรปรับปรุง)

| # | ปัญหา | ตำแหน่ง | รายละเอียด |
|---|---|---|---|
| P2-1 | ProjectThumbnail autoplay บน hover อาจหนัก | `Landing.jsx:9-20` | วีดีโอใหญ่หลายอัน → เบราว์เซอร์หนัก |
| P2-2 | Range request ป้องกัน edge case ไม่ดี | `backend/app/main.py:67` | การเช็ค `end >= file_size` อาจผิดปกติเมื่อ browser ส่ง `bytes=0-1` probe |
| P2-3 | ไม่มี cleanup ไฟล์ source หลังมี proxy | ทั้งระบบ | เปลืองพื้นที่ดิสก์ (source + proxy อยู่คู่กัน) |
| P2-4 | ไม่แสดงขนาดไฟล์/ความยาววีดีโอในการ์ด | `Landing.jsx:205-215` | User ไม่รู้ขนาดงานก่อนเปิด |

---

## 4. คำสั่งการแก้ไขสำหรับ IDE

> **คำแนะนำสำหรับ IDE/AI Coding Assistant:** แก้ตามลำดับ P0 → P1 → P2 ใช้รูปแบบโค้ดที่เข้ากับ codebase เดิม (FastAPI + React hooks + Thai comments)

### ✅ FIX P0-1 + P0-4: แก้ Race Condition ของ Proxy แบบสมบูรณ์

**แนวทาง:** ใช้ไฟล์สถานะ `.proxy_ready` marker เพื่อบอกว่า proxy สร้างเสร็จแล้ว และให้มี API endpoint ให้ frontend poll ตรวจสอบสถานะ

**Step 1 — แก้ `backend/app/transcription.py` ฟังก์ชัน `create_video_proxy` (ประมาณบรรทัด 278-313):**

```python
def create_video_proxy(project_id: str, source_video_rel: str) -> bool:
    source_path = BASE_DIR / source_video_rel
    if not source_path.exists():
        return False

    codec = check_video_codec(source_path)
    file_size_mb = source_path.stat().st_size / (1024 * 1024)
    needs_proxy = codec in {"hevc", "h265", "prores"} or file_size_mb > 50.0

    if not needs_proxy:
        # กรณีไม่ต้องสร้าง proxy ให้ทำเครื่องหมายว่าพร้อมใช้ (ใช้ source ตรงๆ)
        _write_proxy_status(source_path.parent, ready=True)
        return False

    proxy_output = source_path.parent / "source_proxy.mp4"
    # ✅ ใช้ marker file แทนการเช็ค .exists() ของตัว proxy
    marker_path = source_path.parent / ".proxy_ready"

    if marker_path.exists() and proxy_output.exists():
        return True

    # เขียนลง temp file ก่อน แล้วค่อย rename เพื่อกัน atomicity
    temp_output = source_path.parent / "source_proxy.tmp.mp4"
    command = [
        "ffmpeg", "-y",
        "-i", str(source_path),
        "-vcodec", "libx264",
        "-preset", "veryfast",
        "-crf", "28",
        "-vf", "scale=-2:720",
        "-acodec", "aac",
        "-ar", "44100",
        "-ac", "2",
        "-movflags", "+faststart",   # ✅ สำคัญ: ทำให้ stream ได้ทันที
        str(temp_output),
    ]
    try:
        subprocess.run(command, check=True, capture_output=True)
        # ✅ atomic rename — เบราว์เซอร์จะไม่มีทางเห็นไฟล์ครึ่งๆ
        temp_output.replace(proxy_output)
        marker_path.write_text("ready", encoding="utf-8")
        return True
    except Exception:
        for p in (temp_output, proxy_output, marker_path):
            if p.exists():
                p.unlink()
        return False


def _write_proxy_status(folder: Path, ready: bool) -> None:
    """เขียนสถานะ proxy ให้ frontend รู้ว่าเล่นวีดีโอได้แล้ว"""
    marker = folder / ".proxy_ready"
    if ready:
        marker.write_text("ready", encoding="utf-8")
    elif marker.exists():
        marker.unlink()


def get_proxy_status(project_id: str) -> dict:
    """ส่งคืนสถานะ proxy ของโปรเจกต์ ให้ frontend poll ตรวจสอบได้"""
    folder = project_dir(project_id)
    source = folder / "uploads" / "source.mp4"
    proxy = folder / "source_proxy.mp4"
    marker = folder / ".proxy_ready"

    if marker.exists():
        return {"status": "ready", "using_proxy": proxy.exists()}
    if proxy.exists() and not marker.exists():
        return {"status": "processing"}   # ✅ กำลังสร้างอยู่
    # ตรวจว่าต้องสร้าง proxy หรือไม่
    if source.exists():
        codec = check_video_codec(source)
        size_mb = source.stat().st_size / (1024 * 1024)
        if codec in {"hevc", "h265", "prores"} or size_mb > 50.0:
            return {"status": "pending"}
    return {"status": "ready", "using_proxy": False}
```

**Step 2 — แก้ `backend/app/main.py` ฟังก์ชัน `stream_media` (ประมาณบรรทัด 39-49):**

```python
@app.get("/media/storage/{path:path}")
def stream_media(path: str, range: str | None = Header(None)):
    file_path = STORAGE_DIR / path
    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(status_code=404, detail="File not found")

    # ✅ เช็ค marker แทน .exists() — ป้องกัน race condition
    if file_path.name == "source.mp4" or file_path.suffix.lower() in {".mp4", ".mov", ".avi", ".webm", ".mkv"}:
        marker = file_path.parent / ".proxy_ready"
        proxy_path = file_path.parent / "source_proxy.mp4"
        # ✅ ใช้ proxy ก็ต่อเมื่อ marker บอกพร้อม เท่านั้น
        if marker.exists() and proxy_path.exists():
            file_path = proxy_path
        # ถ้า marker ยังไม่มี → เล่น source ตรงๆ (ไม่ใช่ proxy ครึ่งๆ)
    # ... (ส่วนที่เหลือเหมือนเดิม)
```

**Step 3 — เพิ่ม API endpoint ใน `backend/app/routers/projects.py`:**

```python
@router.get("/project/{project_id}/proxy-status")
def proxy_status(project_id: str) -> dict:
    _require_project(project_id)
    from ..transcription import get_proxy_status
    return get_proxy_status(project_id)
```

**Step 4 — แก้ frontend `frontend/src/hooks/useProjects.js` ให้มี helper poll proxy status:**

```javascript
export async function pollProxyReady(projectId, { interval = 1500, timeout = 180000 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await apiRequest(`/api/project/${projectId}/proxy-status`);
      if (res.status === 'ready') return res;
    } catch {
      /* ignore */
    }
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error('proxy timeout');
}
```

---

### ✅ FIX P0-2: เพิ่ม `onError` handler ให้ `<video>` ทุกที่

**ใน `frontend/src/components/PreviewPanel.jsx` (แท็ก `<video>` ประมาณบรรทัด 306):**

```jsx
const { setToast } = useEditor();   // เพิ่มใน destructure ด้านบน

// เพิ่ม state สำหรับติดตาม proxy
const [proxyState, setProxyState] = useState('loading'); // 'loading' | 'ready' | 'error'

// useEffect สำหรับ poll proxy status (ใช้ helper จาก useProjects)
useEffect(() => {
  if (!project?.id) return;
  let cancelled = false;
  setProxyState('loading');
  (async () => {
    try {
      const { pollProxyReady } = await import('../hooks/useProjectsHelpers');
      await pollProxyReady(project.id);
      if (!cancelled) setProxyState('ready');
    } catch {
      if (!cancelled) setProxyState('error');
    }
  })();
  return () => { cancelled = true; };
}, [project?.id]);

// เพิ่ม onError
<video
  ref={videoRef}
  src={src}
  onError={(e) => {
    console.error('Video load error', e);
    setProxyState('error');
    setToast('⚠️ โหลดวีดีโอไม่ได้ อาจเป็นรูปแบบที่เบราว์เซอร์เล่นไม่ได้ (เช่น HEVC) ระบบกำลังแปลงไฟล์ กรุณารอหรือลองอัพโหลดใหม่');
  }}
  onTimeUpdate={(event) => onTime(event.currentTarget.currentTime)}
  onLoadedMetadata={(event) => onDurationChange?.(event.currentTarget.duration || 0)}
  onDurationChange={(event) => onDurationChange?.(event.currentTarget.duration || 0)}
/>

// เพิ่ม overlay ตอน proxyState === 'loading'
{proxyState === 'loading' && (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)', color: '#fff', flexDirection: 'column', gap: '8px', zIndex: 5 }}>
    <div className="spinner" />
    <span>กำลังเตรียมวีดีโอ... (อาจใช้เวลา 30–60 วินาทีสำหรับไฟล์ใหญ่)</span>
  </div>
)}
{proxyState === 'error' && (
  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)', color: '#ff8a8a', textAlign: 'center', padding: '20px', zIndex: 5 }}>
    โหลดวีดีโอไม่ได้<br/>ลองรีเฟรชหน้า หรืออัพโหลดไฟล์ MP4 (H.264) แทน
  </div>
)}
```

**ทำซ้ำเช่นเดียวกันใน `frontend/src/components/Landing.jsx` (ProjectThumbnail, ประมาณบรรทัด 36):**
```jsx
<video
  ref={videoRef}
  src={src}
  onError={() => { /* ซ่อน thumbnail แสดง fallback icon */ }}
  preload="metadata"
  muted
  playsInline
/>
```

---

### ✅ FIX P0-3: ย้าย `extract_audio` ไปเป็น Background Task

**ใน `backend/app/routers/projects.py` (ประมาณบรรทัด 42-52):**

```python
@router.post("/api/projects/upload", response_model=Project)
async def upload_video(background_tasks: BackgroundTasks, file: UploadFile = File(...)) -> Project:
    suffix = Path(file.filename or "source.mp4").suffix.lower() or ".mp4"
    ALLOWED_EXTENSIONS = {".mp4", ".webm", ".mov", ".avi", ".mkv", ".m4v"}
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"ไม่รองรับประเภทไฟล์ {suffix}")

    MAX_SIZE = 500 * 1024 * 1024
    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)
    if size > MAX_SIZE:
        raise HTTPException(status_code=400, detail="ขนาดไฟล์เกินขีดจำกัด 500MB")

    project = create_project(file.filename or "Untitled video", file.file, suffix)

    from ..transcription import create_video_proxy, extract_audio_async
    # ✅ ทั้งสองอย่างเป็น background → response กลับทันที ไม่บล็อก
    background_tasks.add_task(create_video_proxy, project.id, project.source_video)
    background_tasks.add_task(extract_audio_async, project.id, project.source_video)

    return project
```

**เพิ่มใน `backend/app/transcription.py`:**
```python
def extract_audio_async(project_id: str, source_video_rel: str) -> None:
    """เวอร์ชัน background — เซฟ audio_path หลังเสร็จโดยไม่บล็อก request"""
    try:
        audio_path = extract_audio(project_id, source_video_rel)
        if audio_path:
            from .storage import get_project, save_project
            proj = get_project(project_id)
            proj.audio_path = audio_path
            save_project(proj)
    except Exception as exc:
        import logging
        logging.error(f"extract_audio failed for {project_id}: {exc}")
```

---

### ✅ FIX P1-1: เพิ่ม Progress Bar อัพโหลดด้วย XMLHttpRequest

**แก้ `frontend/src/api.js` เพิ่มฟังก์ชัน `uploadWithProgress`:**

```javascript
export function uploadWithProgress(path, formData, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API}${path}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data.detail || `Upload failed (${xhr.status})`));
      } catch (e) {
        reject(new Error('Invalid response from server'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}
```

**แก้ `frontend/src/hooks/useProjects.js` ฟังก์ชัน `uploadVideo` (ประมาณบรรทัด 102-130):**

```javascript
import { apiRequest, uploadWithProgress } from '../api';

const uploadVideo = useCallback(async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const validation = validateVideoFile(file);
  if (!validation.ok) {
    setToast(validation.message);
    event.target.value = '';
    return;
  }
  const form = new FormData();
  form.append('file', file);
  try {
    setLoading?.('upload', true);
    setUploadProgress(0);   // ✅ state ใหม่
    setToast('กำลังอัปโหลด...');
    setVideoDuration(0);
    // ✅ ใช้ uploadWithProgress แทน apiRequest
    const created = await uploadWithProgress('/api/projects/upload', form, {
      onProgress: (pct) => setUploadProgress(pct),
    });
    setProject(created);
    setProjects((items) => [created, ...items]);
    setToast('อัปโหลดวิดีโอแล้ว กำลังเตรียมไฟล์เพื่อเล่น...');
  } catch (error) {
    setToast(`อัปโหลดไม่สำเร็จ: ${error.message}`);
  } finally {
    setLoading?.('upload', false);
    setUploadProgress(null);
    event.target.value = '';
  }
}, [setLoading, setToast, setVideoDuration]);
```

**แสดง progress ใน `Landing.jsx` dropzone:** แสดง `%` ระหว่างอัพโหลด

---

### ✅ FIX P1-2: ปรับปรุง Toast ให้มีประเภท + auto-dismiss

**แทนที่ `frontend/src/components/Toast.jsx` ทั้งไฟล์:**

```jsx
import React, { useEffect } from 'react';

export function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [message, onClose, duration]);

  if (!message) return null;
  const colors = {
    info:    { bg: 'rgba(40,40,44,0.95)',  border: 'rgba(255,255,255,0.1)',  fg: '#dfdfdf' },
    success: { bg: 'rgba(16,185,129,0.95)', border: 'rgba(16,185,129,0.4)',  fg: '#fff' },
    warning: { bg: 'rgba(245,158,11,0.95)', border: 'rgba(245,158,11,0.4)',  fg: '#fff' },
    error:   { bg: 'rgba(239,68,68,0.95)',  border: 'rgba(239,68,68,0.4)',   fg: '#fff' },
  };
  const c = colors[type] || colors.info;
  return (
    <button
      className="toast"
      onClick={onClose}
      type="button"
      style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.fg }}
    >
      {message}
    </button>
  );
}
```

**ปรับ `main.jsx` ให้ toast เป็น object:** `const [toast, setToast] = useState({ message: '', type: 'info' })` และ wrapper `showToast(message, type)`

---

### ✅ FIX P1-3: เพิ่ม Timeout ใน `apiRequest`

**ใน `frontend/src/api.js`:**

```javascript
export async function apiRequest(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout ?? 60000);
  try {
    const response = await fetch(`${API}${path}`, {
      ...options,
      signal: options.signal ?? controller.signal,
    });
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
    if (!response.ok) {
      const detail = typeof payload === 'object' && payload?.detail
        ? (Array.isArray(payload.detail)
          ? payload.detail.map((item) => item?.msg || JSON.stringify(item)).join('; ')
          : payload.detail)
        : payload;
      throw new Error(detail || `Request failed with status ${response.status}`);
    }
    return payload;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('คำขอหมดเวลา (timeout) ลองใหม่อีกครั้ง');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}
```

---

### ✅ FIX P1-4: เพิ่ม Job Workers

**ใน `backend/app/jobs.py` (ประมาณบรรทัด 14):**
```python
# เพิ่มจาก 2 เป็น 4 (หรืออ่านจาก env)
import os
MAX_WORKERS = int(os.getenv("FASTSUB_JOB_WORKERS", "4"))
_executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)
```

---

## 5. เกณฑ์การทดสอบ

หลังแก้ทั้งหมดแล้ว ทดสอบดังนี้ — **ต้องผ่านครบถึงจะให้ user ใช้ได้:**

### ทดสอบ P0 (วิกฤต)
- [ ] อัพโหลดวีดีโอ ~80MB (เช่น `วีดีโอร้านขนมตาล01.mp4`) → ต้องเห็น progress bar ระหว่างอัพโหลด
- [ ] หลังอัพโหลดเสร็จ → หน้า Editor ต้องแสดงข้อความ "กำลังเตรียมวีดีโอ..." (ไม่ใช่จอว่าง)
- [ ] รอ 30–60 วินาที → วีดีโอต้องเล่นได้ปกติ มีเสียง ควบคุมได้
- [ ] ทดสอบวีดีโอ HEVC (จาก iPhone) → ต้องเล่นได้หลัง proxy พร้อม
- [ ] ทดสอบวีดีโอเสียหาย/รูปแบบไม่รองรับ → ต้องมีข้อความแจ้งเตือน (ไม่ใช่จอว่างเงียบ)

### ทดสอบ P1 (UX)
- [ ] Toast แจ้งเตือนต้องหายไปเองใน 4 วินาที + แยกสีตามประเภท
- [ ] API request ค้างเกิน 60 วินาที → ต้องแจ้ง timeout
- [ ] รันงานหนัก 3 งานพร้อมกัน → ต้องไม่ค้าง

### ทดสอบ P2 (ปรับปรุง)
- [ ] การ์ดโปรเจกต์แสดงขนาด/ความยาว
- [ ] ลบไฟล์ source เมื่อมี proxy แล้ว (ประหยัดดิสก์)

---

## 📌 หมายเหตุสำหรับผู้ที่ไม่มีความรู้ code

ถ้าคุณเป็นคนสั่ง IDE (เช่น Cursor / Copilot / ZCode) แก้ไข ให้ copy ไฟล์นี้ทั้งหมดไปวางใน prompt แล้วพิมพ์ว่า:

> **"อ่านไฟล์ AUDIT-LARGE-VIDEO-FIX.md แล้วแก้ปัญหาตามหมวด 4 ทีละขั้น P0 ก่อน แล้วถึง P1 อย่าข้ามขั้น แต่ละขั้นให้ทดสอบก่อนไปขั้นต่อไป"**

ขอแนะนำให้แก้ตามลำดับนี้:
1. **P0-1 + P0-4 ก่อน** (แก้ race condition + เพิ่ม proxy status API) — นี่คือตัวการหลัก
2. **P0-2** (เพิ่ม onError + loading overlay) — ป้องกันจอว่างเงียบ
3. **P0-3** (ย้าย extract_audio เป็น background) — แก้อาการ "ค้าง"
4. **P1** ทั้งหมด (UX) — หลัง P0 ผ่านแล้ว

หลังแก้ P0 ครบ ทดสอบอัพโหลดไฟล์ `วีดีโอร้านขนมตาล01.mp4` อีกครั้ง — ถ้ายังไม่ได้ แสดงว่ายังมีปัญหาซ่อนอยู่ ให้ตรวจดู console ของเบราว์เซอร์ (กด F12)

---

*จบรายงาน — สร้างโดยการตรวจสอบโค้ด FASTSUB เวอร์ชัน commit 4554fde*
