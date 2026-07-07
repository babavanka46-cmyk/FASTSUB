# FASTSUB

FASTSUB is a local full-stack subtitle editor with a companion Chrome extension for AI-assisted Thai subtitle correction.

FASTSUB is designed for local desktop use. The API has no authentication and should be bound to `127.0.0.1` only unless you add your own access control.

## Apps

- `backend/` - FastAPI server on `http://localhost:8100`
- `frontend/` - React + Vite editor UI
- `extension/` - Chrome Manifest V3 popup bridge for Gemini correction

## Quick Start

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8100
```

Optional local AI/video packages:

```powershell
pip install faster-whisper moviepy
```

Install FFmpeg and make sure `ffmpeg` is on your `PATH` for audio extraction and final rendering.

### Local Whisper

FASTSUB uses `faster-whisper` for local transcription. The first transcription or preload downloads the selected model from Hugging Face, then reuses the local cache.

Useful endpoints:

```powershell
Invoke-WebRequest -UseBasicParsing http://127.0.0.1:8100/api/whisper/status
Invoke-WebRequest -UseBasicParsing -Method Post "http://127.0.0.1:8100/api/whisper/preload?model=small&device=cpu&compute_type=int8"
Invoke-WebRequest -UseBasicParsing -Method Post "http://127.0.0.1:8100/api/project/{project_id}/transcribe?language=th&model=small&device=cpu&compute_type=int8&vad_filter=false"
```

Default settings can be changed with environment variables before starting the backend:

```powershell
$env:FASTSUB_WHISPER_MODEL="small"
$env:FASTSUB_WHISPER_DEVICE="cpu"
$env:FASTSUB_WHISPER_COMPUTE_TYPE="int8"
```

For NVIDIA GPU setups, try `device=cuda&compute_type=float16` after installing compatible CUDA runtime libraries.

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open the Vite URL, usually `http://localhost:5173`.

### Chrome Extension

1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Load unpacked extension from the `extension/` folder.
4. Enter your Gemini API key in the popup.
5. Set the active project id and run correction.

## Backend API

- `GET /api/health`
- `POST /api/projects/upload`
- `GET /api/projects`
- `GET /api/project/{project_id}`
- `GET /api/project/{project_id}/subtitles`
- `POST /api/project/{project_id}/subtitles`
- `POST /api/project/{project_id}/subtitles/export?output_format=srt|vtt|ass`
- `POST /api/project/{project_id}/transcribe`
- `POST /api/project/{project_id}/transcribe/jobs`
- `POST /api/project/{project_id}/render`
- `POST /api/project/{project_id}/render/jobs`
- `GET /api/jobs/{job_id}`
- `POST /api/jobs/{job_id}/cancel`
- `POST /api/project/{project_id}/autocorrect`

Generated project files are stored under `backend/storage/projects/`.

## Faster Auto Subtitle Features Added

Inspired by `Sirozha1337/faster-auto-subtitle`, FASTSUB now supports:

- Exporting subtitle files as `SRT`, `VTT`, and `ASS`.
- Hard subtitle rendering with burned-in styled subtitles.
- Soft subtitle rendering is currently disabled in the UI because it does not yet match the styled preview, BGM mix, resolution, and FPS pipeline.

Render request example:

```json
{
  "resolution": "720p",
  "fps": 24,
  "subtitle_type": "hard"
}
```
