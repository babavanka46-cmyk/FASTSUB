# FASTSUB Fix Bug Implementation Plan

## Current Verification

- Frontend production build passes with `npm.cmd run build`.
- Backend Python compile passes with `python -m compileall backend\app`.
- Backend Whisper local is installed and `/api/whisper/status` reports `installed: true`.
- Local servers are expected to run on:
  - Frontend: `http://127.0.0.1:5173`
  - Backend: `http://127.0.0.1:8100`

## Priority 0: Bugs That Can Break Core Workflows

### 1. Frontend Shows Success Even When API Requests Fail

Status: partially fixed.

Affected flows:

- Upload video
- Transcribe with Whisper
- Save subtitles
- Auto correct
- Render video

Current behavior:

- The frontend calls `response.json()` without checking `response.ok`.
- If the backend returns `500`, the UI may still show a success toast or may put an error object into subtitle state.

Fix plan:

1. Add a shared `apiRequest(path, options)` helper in `frontend/src/main.jsx`.
2. Throw readable errors when `response.ok` is false.
3. Wrap upload/transcribe/save/autocorrect/render in `try/catch/finally`.
4. Show backend error detail in the toast.
5. Prevent subtitle state from being overwritten by error payloads.

Acceptance test:

- Stop backend and click transcribe. UI should show a clear connection error.
- Trigger a backend `500`. UI should show backend `detail`, not "ถอดเสียงเรียบร้อย".

Implemented now:

- Added a shared frontend `apiRequest()` helper.
- Wrapped upload, transcribe, save, autocorrect, and render in `try/catch`.
- Prevented error payloads from replacing subtitle state.

### 2. Timeline Click Can Crash When Video Ref Is Missing

Status: fixed.

Affected file:

- `frontend/src/main.jsx`

Current behavior:

- `TimelinePanel` runs `videoRef.current.currentTime = next` without checking `videoRef.current`.

Fix plan:

1. Guard `if (!videoRef.current) return`.
2. Clamp timeline target time between `0` and `duration`.
3. Avoid `NaN` when duration is missing.

Acceptance test:

- Open editor before video metadata loads and click timeline. No console error should appear.

Implemented now:

- Added a `videoRef.current` guard.
- Added duration validation and click-time clamping.

### 3. Transcribe Button Does Not Pass User Selected Options

Status: fixed.

Affected flow:

- Top toolbar language/device selections.

Current behavior:

- Toolbar shows language/GPU options, but `transcribe()` always calls `/transcribe` with backend defaults.
- GPU label says success even when CPU is used.

Fix plan:

1. Add frontend state for `language`, `whisperModel`, `device`, `computeType`, and `vadFilter`.
2. Wire toolbar controls to state.
3. Call:
   `/api/project/{id}/transcribe?language=...&model=...&device=...&compute_type=...&vad_filter=...`
4. Replace hard-coded GPU status text with real status from `/api/whisper/status`.

Acceptance test:

- Selecting CPU/GPU changes the request query.
- Toolbar status reflects actual backend loaded model and device.

Implemented now:

- Added frontend state for language, model, device, compute type, and VAD filter.
- Wired toolbar language/model/device/compute controls to the transcribe API query.
- Replaced hard-coded GPU success text with `/api/whisper/status` output.

### 4. Render Path Is Fragile on Windows

Status: fixed.

Affected file:

- `backend/app/rendering.py`

Current behavior:

- FFmpeg subtitle filter uses a quoted path inside `-vf`.
- Windows paths and special characters can break the `subtitles=` filter.
- BGM mix plus `-vf` can be invalid when filter graph complexity grows.

Fix plan:

1. Escape subtitle paths for FFmpeg filter syntax.
2. Prefer `Path.as_posix()` plus drive escaping for Windows, or copy `.ass` to a simple temp filename.
3. Add render smoke test using a short fixture video.
4. Return a structured render error object with stderr, command path, and output file path.

Acceptance test:

- Render works for project folders containing Thai filenames.
- Render works with and without BGM.

Implemented now:

- Escaped subtitle file paths for FFmpeg filter syntax.
- Changed BGM render mode to use `filter_complex` for both video and audio when BGM is present.
- Smoke-tested real render without BGM on project `2c0896ece6c9`; render completed and produced `renders/final.mp4`.

Remaining:

- Add a BGM fixture and smoke-test render with BGM as a separate audio-mixing task.

Related faster-auto-subtitle feature added:

- Added hard/soft subtitle render modes.
- Soft mode embeds an MP4 `mov_text` subtitle stream.
- Verified with `ffprobe` that rendered output includes subtitle stream index `2`.

## Priority 1: Bugs That Cause Incorrect Results

### 5. Words Per Line UI Does Not Actually Regroup Subtitle Segments

Current behavior:

- The UI changes CSS grid columns only.
- It does not create new subtitle line groups or timing groups.

Fix plan:

1. Create a `regroupWords(segments, wordsPerLine)` utility.
2. Preserve each word timestamp.
3. Generate display lines/groups from word chunks.
4. Save both raw word data and layout setting.

Acceptance test:

- Switching 1, 3, or 5 words per line changes preview grouping and saved subtitle layout.

### 6. Active Word Preview Only Shows Segment Text, Not Grouped Lines

Current behavior:

- Preview renders every word in active segment.
- Long segments can overflow the vertical video frame.

Fix plan:

1. Use the same grouped line utility from bug 5.
2. Show only the active line group around current time.
3. Add max line count and responsive font scaling for narrow frames.

Acceptance test:

- Long subtitle segments stay inside the 9:16 preview.

### 7. Local Auto Correct Is Not Real Correction

Current behavior:

- Local mode only trims and joins words.
- Button label implies AI correction.

Fix plan:

1. Rename local action to "Normalize spacing" or wire it to a real local correction service.
2. Keep Gemini correction as explicit "Gemini Auto Correct".
3. Add UI state for Gemini API key or extension bridge status.

Acceptance test:

- Users can tell whether they are using local normalization or Gemini correction.

## Priority 2: Missing/Incomplete Feature Wiring

### 8. Translation Button Is UI Only

Current behavior:

- Translation tab button does not call backend `/translate`.

Fix plan:

1. Add `translateSubtitles(targetLanguage)` frontend handler.
2. Call `POST /api/project/{id}/translate`.
3. Decide whether translated subtitles overwrite current subtitles or create a language layer.

Acceptance test:

- Selecting English and clicking translate changes subtitle data or creates a translated layer.

### 9. BGM Upload and Render Settings Are Not Wired in UI

Current behavior:

- Backend has `/assets/bgm`, but frontend BGM panel only shows static controls.
- Render request sends no `bgm_path`.

Fix plan:

1. Add BGM file input.
2. Upload to `/api/project/{id}/assets/bgm`.
3. Store returned `path` in audio settings state.
4. Send full audio settings in render request.

Acceptance test:

- Uploaded BGM is mixed into rendered video at selected volume.

### 10. SFX Controls Are UI Only

Current behavior:

- SFX density and volume controls do not affect backend render.

Fix plan:

1. Decide SFX asset library format.
2. Add backend SFX insertion during render.
3. Use deterministic random seed per render for reproducibility.
4. Expose selected SFX in render settings.

Acceptance test:

- Rendered video contains SFX at selected subtitle timestamps.

## Priority 3: Stability and Maintainability

### 10.5 Subtitle File Export

Status: fixed.

Source inspiration:

- `Sirozha1337/faster-auto-subtitle` subtitle output workflow.

Implemented now:

- Added backend export endpoint: `POST /api/project/{id}/subtitles/export?output_format=srt|vtt|ass`.
- Added SRT, VTT, and ASS file generation under each project's `exports/` folder.
- Added UI export buttons in the Export panel.
- Verified SRT/VTT/ASS export succeeds on project `2c0896ece6c9`.

### 11. `main.jsx` Is Too Large

Current behavior:

- Most frontend components and logic live in one file.

Fix plan:

1. Split into:
   - `src/api.js`
   - `src/App.jsx`
   - `src/components/Landing.jsx`
   - `src/components/Editor.jsx`
   - `src/components/TranscriptPanel.jsx`
   - `src/components/PreviewPanel.jsx`
   - `src/components/InspectorPanel.jsx`
   - `src/components/TimelinePanel.jsx`
2. Keep shared utilities in `src/subtitleUtils.js`.

Acceptance test:

- Build remains green after component split.

### 12. Unused Imports and Dead Code

Status: fixed.

Current examples:

- `FileUp`, `Settings2`, and `Zap` are imported but unused.
- `_demo_transcript` remains in backend but no longer used by production transcription.

Fix plan:

1. Remove unused frontend imports.
2. Move demo transcript to a dev-only endpoint or remove it.
3. Add linting later if desired.

Acceptance test:

- No unused imports in frontend.
- No dead demo path used in production.

Implemented now:

- Removed unused frontend icon imports from `main.jsx`.
- Removed unused `_demo_transcript` backend function.

### 13. Server Process Reliability

Status: partially fixed.

Current behavior:

- Dev servers have stopped between sessions.
- User sees "This site can't be reached" when frontend server exits.

Fix plan:

1. Add a single `run-dev.bat` that starts backend and frontend with clear windows/logs.
2. Add `logs/` output for backend/frontend.
3. Add a `check-dev.bat` health check script.
4. Optionally add `concurrently` for a single frontend-managed dev command.

Acceptance test:

- Double-clicking one script starts both servers.
- Health script reports frontend/backend status clearly.

Implemented now:

- Added `run-dev.bat` to start backend and frontend together.
- Added `check-dev.bat` to report backend/frontend health.
- Verified `check-dev.bat` reports Backend `OK` and Frontend `OK`.

Remaining:

- Add persistent log redirection if needed for long-running debugging.

## Suggested Implementation Order

1. Add frontend API error handling and loading states.
2. Fix timeline null-ref and duration clamping.
3. Wire Whisper settings from toolbar to backend query.
4. Stabilize FFmpeg render path on Windows.
5. Implement actual subtitle regrouping by words per line.
6. Wire translation, BGM upload, and SFX render behavior.
7. Split frontend files and remove unused imports/dead code.
8. Add dev scripts and health checks.

## Regression Test Checklist

- Upload a new MP4.
- Confirm `audio/source.wav` is created.
- Preload Whisper with `small/cpu/int8`.
- Transcribe Thai audio and confirm non-empty `segments` and `words`.
- Edit a word and save.
- Reload project and confirm edit persists.
- Click timeline before and after video loads.
- Render video without BGM.
- Upload BGM and render with BGM.
- Load Chrome extension and confirm it can fetch/save subtitles through `localhost:8100`.
