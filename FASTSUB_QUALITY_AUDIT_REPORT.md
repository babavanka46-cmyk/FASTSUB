# FASTSUB Complete Quality Audit

Audit date: 2026-07-06  
Scope: frontend React/Vite app, FastAPI backend, local Whisper/Faster-Whisper flow, subtitle export/render pipeline, visible localhost UI.  
Smoke checks performed: `GET /api/health` OK, `GET /api/whisper/status` OK with `small/cpu/int8` loaded, `GET /api/projects` OK, `npm.cmd run build` OK, browser DOM showed no first-page horizontal overflow after the latest CSS fix.

## Executive Summary

FASTSUB is a working local prototype for upload, local Faster-Whisper transcription, word editing, basic subtitle preview, SRT/VTT/ASS export, and FFmpeg rendering. It is not release-ready as a desktop editor yet. The largest gap is that many visible editor controls are UI-only: they look clickable but do not change state or call backend logic. Long-running operations are synchronous, have no progress/cancel/retry model, and can freeze user flow. Timeline, transcript, keyboard shortcuts, autosave/crash recovery, and export management are mostly incomplete.

Recommended default Thai font: `Noto Sans Thai`. It is the safest default for Thai, English, numbers, mixed language, and broad glyph coverage. For a creator-style UI, add alternatives `Anuphan`, `Prompt`, `Kanit`, `IBM Plex Sans Thai`, and `Sarabun`; render/export should embed or use a local bundled font file, not depend on online Google Fonts.

Release Readiness Score: **38 / 100**

## Inspected Coverage Matrix

| Module | Status |
|---|---|
| Video Player | Partial: play/pause through native video ref works; many controls are fake or not synchronized. |
| Transcript Panel | Partial: word text editing works in state; delete/search/insert/multiselect/undo/redo are missing. |
| Timeline | Minimal: click-to-seek works; drag/resize/snap/zoom/multiselect are missing. |
| Subtitle Rendering | Partial: FFmpeg hard/soft subtitle paths exist; font, preview parity, progress, cancellation are weak. |
| Style Panel | Partial: preset and basic sliders work; font selector, reset, saved presets, opacity, alignment are missing. |
| Whisper | Partial: Faster-Whisper works; progress/cancel/retry, model validation, GPU fallback, offline model handling are missing. |
| Export | Partial: SRT/VTT/ASS and MP4 render exist; TXT, naming, overwrite, cancel, progress, path handling are missing. |
| UI | Prototype quality: improved first page, but editor has many enabled nonfunctional controls. |
| Keyboard Shortcuts | Missing. |
| Data | Basic JSON persistence; no autosave debounce, recovery, migration, corrupt-json handling. |
| Performance | Untested at scale; current implementation likely degrades with thousands of word chips. |
| UX | Workflow is unclear because controls do not reveal disabled/incomplete states. |
| Fonts | Needs change: frontend uses `Inter`; backend render default is `Arial`. |
| Error Handling | Basic exception messages only; no structured user recovery for missing FFmpeg/model/GPU/disk/permission. |

## Issues

### 1. Enabled UI controls do nothing

Severity: High  
Category: UX / Bug  
Description: Multiple visible controls are clickable but have no `onClick`/state behavior, including transcript add, delete word, hide strange words, preview zoom/full frame/full screen, split, merge, insert, panel collapse, extra rail add, and translation button. Evidence: `frontend/src/main.jsx:436`, `443`, `455-456`, `467`, `490-491`, `540`, `582`, `604-605`.  
Steps to reproduce: Open editor, click the listed controls.  
Expected result: Each control performs the named action or is disabled/hidden.  
Actual result: Many controls visually press but no behavior changes.  
Possible root cause: UI scaffold was built before feature logic.  
Suggested fix: Add real handlers and backend endpoints, or mark unfinished controls disabled with tooltips.  
Estimated difficulty: Medium

### 2. No keyboard shortcuts

Severity: High  
Category: UX / Accessibility  
Description: No `keydown` listener or shortcut map exists for Space, Delete, Ctrl+Z, Ctrl+Y, Ctrl+S, Ctrl+C/V/A, arrows, Home/End, or shift selection.  
Steps to reproduce: Try standard editor shortcuts while editing timeline/transcript.  
Expected result: Keyboard actions match common video/subtitle editors.  
Actual result: Browser/native input behavior only.  
Possible root cause: Missing global shortcut architecture and focus rules.  
Suggested fix: Implement a shortcut manager with focus-aware routing and tests.  
Estimated difficulty: Medium

### 3. Long-running transcription blocks as a single request

Severity: High  
Category: Performance / UX  
Description: `POST /api/project/{id}/transcribe` runs Faster-Whisper synchronously and returns only when complete. There is no job id, progress, cancel, retry, or partial result. Evidence: `backend/app/main.py:97-110`, `backend/app/transcription.py:113-158`.  
Steps to reproduce: Transcribe a long video or use medium model on CPU.  
Expected result: Progress, cancel, recoverable failure, and UI remains informative.  
Actual result: Toast says "กำลังถอดเสียง..." until request resolves or fails.  
Possible root cause: Endpoint design lacks background task queue.  
Suggested fix: Add job table/status endpoint, worker thread/process, progress events, cancel token, and retry action.  
Estimated difficulty: Large

### 4. Rendering blocks as a single request

Severity: High  
Category: Performance / UX  
Description: FFmpeg render runs synchronously with `subprocess.run`. No render progress, cancel, or queue. Evidence: `backend/app/rendering.py:66`, `105`.  
Steps to reproduce: Render a multi-minute video.  
Expected result: Progress bar, cancel, output path, and failure recovery.  
Actual result: UI waits for one HTTP request and only receives final message.  
Possible root cause: No background render job system.  
Suggested fix: Use FFmpeg progress pipe (`-progress pipe:1`), job status endpoint, cancellation by process handle.  
Estimated difficulty: Large

### 5. Thai render font defaults to Arial

Severity: High  
Category: UI / Rendering  
Description: Backend render default is `Arial`, which is weak for Thai typography and may differ from preview. Evidence: `backend/app/models.py:55`; frontend default is `Inter` at `frontend/src/main.jsx:41`.  
Steps to reproduce: Render Thai subtitles on a Windows machine without desired Thai font configured.  
Expected result: Thai text renders with a known, bundled Thai font.  
Actual result: FFmpeg/ASS may fallback unpredictably.  
Possible root cause: No bundled font strategy and frontend/backend default mismatch.  
Suggested fix: Bundle `Noto Sans Thai`, set it as frontend/backend default, and pass `fontsdir` to FFmpeg subtitles filter.  
Estimated difficulty: Medium

### 6. Preview and render style are not consistent

Severity: High  
Category: Rendering / Logic  
Description: Preview uses CSS clamp, text shadow, browser fonts, and current words only; ASS render uses fixed PlayRes 1920x1080, outline/shadow constants, and segment-wide karaoke words. Evidence: `frontend/src/main.jsx:497-510`, `backend/app/rendering.py:134-159`.  
Steps to reproduce: Tune style in preview, render video, compare output.  
Expected result: Render matches preview closely.  
Actual result: Font size, shadow, line breaks, active word timing, and vertical offset can differ.  
Possible root cause: Two independent rendering engines with different style models.  
Suggested fix: Define one subtitle layout model and map all preview/render properties explicitly. Add visual regression samples.  
Estimated difficulty: Large

### 7. Timeline supports click seek only

Severity: High  
Category: Bug / Missing Feature  
Description: Timeline has click-to-seek, but no dragging captions, resize duration, snap, zoom, scroll, linked captions, multiselect, right click, or keyboard editing. Evidence: `frontend/src/main.jsx:611-618`.  
Steps to reproduce: Try dragging or resizing a caption chip.  
Expected result: Caption timing can be edited interactively.  
Actual result: Chips are static spans.  
Possible root cause: Timeline is display-only except track click.  
Suggested fix: Add timeline interaction model with draggable handles, selected caption state, and undoable timing edits.  
Estimated difficulty: Large

### 8. Transcript delete button is nonfunctional

Severity: High  
Category: Bug  
Description: Each word row has a `ลบ` button with no handler. Evidence: `frontend/src/main.jsx:467`.  
Steps to reproduce: Open a transcript and click a word's delete button.  
Expected result: Word is removed and segment text/timing updates.  
Actual result: Nothing happens.  
Possible root cause: Missing mutation handler.  
Suggested fix: Implement `deleteWord(segmentId, wordId)` with active selection and save behavior.  
Estimated difficulty: Small

### 9. Search box does not search

Severity: Medium  
Category: UX / Bug  
Description: Transcript search input has no state, filtering, navigation, or highlight. Evidence: `frontend/src/main.jsx:439-441`.  
Steps to reproduce: Type text in transcript search.  
Expected result: Matching words/segments are highlighted and navigable.  
Actual result: No visible change.  
Possible root cause: Input scaffold without state.  
Suggested fix: Add query state, filtered/highlighted rows, next/previous result controls.  
Estimated difficulty: Medium

### 10. No undo/redo model

Severity: High  
Category: UX / Data  
Description: Word editing mutates React state only; no history stack exists for text, timing, delete, merge, split, or style changes. Evidence: `frontend/src/main.jsx:223-233`.  
Steps to reproduce: Edit a subtitle then press Ctrl+Z/Ctrl+Y.  
Expected result: Undo/redo restores previous editor states.  
Actual result: No app-level undo/redo.  
Possible root cause: No command/history abstraction.  
Suggested fix: Wrap mutations in command objects and maintain bounded undo/redo stacks.  
Estimated difficulty: Large

### 11. Manual save only; unsaved changes warning is fake

Severity: High  
Category: Data / UX  
Description: Topbar always says changes exist, but app does not track dirty state, autosave, before-unload warning, or conflict resolution. Evidence: `frontend/src/main.jsx:383`, save at `159-173`.  
Steps to reproduce: Edit text and close/reload without pressing save.  
Expected result: Autosave or confirmation before losing work.  
Actual result: Changes can be lost.  
Possible root cause: Missing dirty-state/autosave system.  
Suggested fix: Add dirty flag, debounced autosave, save status, unload guard, and recovery draft.  
Estimated difficulty: Medium

### 12. Project JSON corruption can break list/reopen

Severity: High  
Category: Data / Error Handling  
Description: `list_projects()` validates every `project.json` without per-file exception handling. One corrupt JSON can break `/api/projects`. Evidence: `backend/app/storage.py:79-80`.  
Steps to reproduce: Corrupt one `backend/storage/projects/*/project.json`, call `/api/projects`.  
Expected result: Bad project is skipped/reported; remaining projects load.  
Actual result: Endpoint can return 500.  
Possible root cause: No storage validation/recovery layer.  
Suggested fix: Catch validation/json errors per project, quarantine broken projects, show repair action.  
Estimated difficulty: Small

### 13. Existing project names show mojibake for Thai filenames

Severity: Medium  
Category: Data / UI  
Description: Smoke test of `/api/projects` returned multiple old Thai filenames encoded as mojibake.  
Steps to reproduce: Call `GET /api/projects` with existing storage data.  
Expected result: Thai filenames appear correctly.  
Actual result: Some names appear as `à¸...`.  
Possible root cause: Prior upload/client decoding or old stored JSON data encoded incorrectly.  
Suggested fix: Add a one-time migration/repair tool for project names and validate upload filename decoding.  
Estimated difficulty: Medium

### 14. No model validation for large/unsupported Whisper choices

Severity: Medium  
Category: Error Handling / UX  
Description: Backend accepts model query strings directly; frontend offers tiny/base/small/medium but not large, and no preflight disk/GPU/memory validation. Evidence: `backend/app/main.py:101`, `backend/app/transcription.py:97-107`, `frontend/src/main.jsx:394-398`.  
Steps to reproduce: Call transcribe with an invalid or very large model.  
Expected result: Friendly validation and supported model list.  
Actual result: Model load error after request starts.  
Possible root cause: Direct pass-through to Faster-Whisper.  
Suggested fix: Define supported models/devices/compute types with preflight status and recommended settings.  
Estimated difficulty: Small

### 15. GPU fallback is missing

Severity: Medium  
Category: Error Handling  
Description: Selecting CUDA with unavailable GPU/driver fails model load; no automatic fallback to CPU/int8. Evidence: `frontend/src/main.jsx:400-406`, `backend/app/transcription.py:103-107`.  
Steps to reproduce: Select GPU CUDA on a machine without compatible CUDA.  
Expected result: App warns and offers CPU fallback.  
Actual result: Transcription fails.  
Possible root cause: No device capability probe.  
Suggested fix: Add backend device check and fallback decision before loading model.  
Estimated difficulty: Medium

### 16. Offline first-run model download is not handled

Severity: High  
Category: Error Handling / Product  
Description: App is positioned as offline, but first load of a missing Faster-Whisper model can require internet/cache. Error message mentions internet but there is no model manager. Evidence: `backend/app/transcription.py:103-107`.  
Steps to reproduce: Clear model cache, disconnect internet, transcribe.  
Expected result: App shows missing local model and setup path.  
Actual result: Generic model load failure.  
Possible root cause: No local model inventory or installer.  
Suggested fix: Add model cache detection, local model folder selection, and offline setup screen.  
Estimated difficulty: Large

### 17. Export supports no TXT and no naming options

Severity: Medium  
Category: Missing Feature  
Description: API pattern only allows SRT/VTT/ASS; TXT requested by audit scope is missing. All exports overwrite `subtitles.{format}`. Evidence: `backend/app/main.py:136-139`, `backend/app/subtitle_export.py:18-25`.  
Steps to reproduce: Try export TXT or export two variants.  
Expected result: TXT export and user-controlled filename/location.  
Actual result: TXT unsupported; fixed file overwritten.  
Possible root cause: Minimal export implementation.  
Suggested fix: Add TXT serializer and export naming/location workflow.  
Estimated difficulty: Medium

### 18. Export opens a browser tab instead of desktop save workflow

Severity: Medium  
Category: UX / Electron  
Description: `window.open()` downloads/opens files via browser behavior rather than local save dialog or reveal-in-folder. Evidence: `frontend/src/main.jsx:217`.  
Steps to reproduce: Click SRT/VTT/ASS export.  
Expected result: Desktop app save location or clear downloaded file path.  
Actual result: Browser opens a media URL.  
Possible root cause: Web prototype not integrated with Electron/native filesystem.  
Suggested fix: For desktop, use native save dialog; for web, use Blob download with chosen filename.  
Estimated difficulty: Medium

### 19. MP4 render always overwrites `final.mp4`

Severity: Medium  
Category: Data / UX  
Description: Render output path is fixed to `renders/final.mp4`. Evidence: `backend/app/rendering.py:20`.  
Steps to reproduce: Render multiple versions with different settings.  
Expected result: User can keep versions or confirm overwrite.  
Actual result: Previous render is overwritten silently.  
Possible root cause: Single-output prototype path.  
Suggested fix: Add versioned filenames or overwrite confirmation.  
Estimated difficulty: Small

### 20. Background music UI is not wired to render settings

Severity: Medium  
Category: Bug / UX  
Description: Backend supports `settings.audio.bgm_path`, but frontend BGM controls do not upload/select a file and render sends no `bgm_path`. Evidence: `frontend/src/main.jsx:543-547`, `191-207`, backend upload route `backend/app/main.py:120-126`.  
Steps to reproduce: Choose BGM UI options then render.  
Expected result: Selected music is included.  
Actual result: Render request has no BGM file path.  
Possible root cause: Backend capability added without frontend integration.  
Suggested fix: Add BGM upload/select state and include it in render payload.  
Estimated difficulty: Medium

### 21. SFX UI has no rendering implementation

Severity: Medium  
Category: Missing Feature  
Description: SFX controls exist but backend render ignores `sfx_name`, `sfx_density`, and `sfx_volume`. Evidence: `frontend/src/main.jsx:549-553`, `backend/app/rendering.py:34-64`.  
Steps to reproduce: Set SFX options and render.  
Expected result: Sound effects are mixed into output.  
Actual result: No SFX output change.  
Possible root cause: Audio settings model is ahead of render implementation.  
Suggested fix: Implement SFX asset library/timeline placement or hide controls.  
Estimated difficulty: Large

### 22. Translation endpoint is fake and frontend button is not wired

Severity: Medium  
Category: Logic / UX  
Description: Backend translation only prefixes text with `[target]`; frontend translation button has no handler. Evidence: `backend/app/main.py:163-170`, `frontend/src/main.jsx:540`.  
Steps to reproduce: Use translation panel.  
Expected result: Real translation or clear unavailable state.  
Actual result: UI button does nothing; API would not translate meaningfully.  
Possible root cause: Placeholder implementation.  
Suggested fix: Either implement local/remote provider selection or label as unavailable.  
Estimated difficulty: Large

### 23. Autocorrect local mode is not real correction

Severity: Medium  
Category: Logic  
Description: Local autocorrect only joins words and normalizes whitespace. It does not correct spelling/grammar. Evidence: `backend/app/main.py:152-161`.  
Steps to reproduce: Add Thai spelling error and click autocorrect.  
Expected result: Error is corrected or user is told provider required.  
Actual result: Text is rebuilt from words.  
Possible root cause: Placeholder local implementation.  
Suggested fix: Rename to "normalize spacing" or implement Thai correction dictionary/model.  
Estimated difficulty: Medium

### 24. Video player controls are incomplete

Severity: Medium  
Category: Missing Feature  
Description: Native video has no visible loading/error state, replay, frame step, volume, mute, speed binding, loop, resize/aspect behavior, unsupported format message, or replace confirmation.  
Steps to reproduce: Open editor and inspect player controls.  
Expected result: Complete video editor controls.  
Actual result: Basic video element plus play/pause buttons only.  
Possible root cause: Minimal preview implementation.  
Suggested fix: Add player state machine and explicit controls with disabled/empty states.  
Estimated difficulty: Large

### 25. Mini scrubber is not synchronized with video

Severity: Medium  
Category: Bug  
Description: Preview mini scrubber uses static range default and static duration text; play button has no handler. Evidence: `frontend/src/main.jsx:514-518`.  
Steps to reproduce: Move video/timeline and observe mini scrubber.  
Expected result: Scrubber reflects current video time and seeks.  
Actual result: Static UI.  
Possible root cause: Display scaffold.  
Suggested fix: Bind range value/max to currentTime/duration and implement play toggle.  
Estimated difficulty: Small

### 26. Active transcript row does not auto-scroll into view

Severity: Medium  
Category: UX  
Description: Active word receives class, but no `scrollIntoView` or virtualization is implemented. Evidence: active class at `frontend/src/main.jsx:461`.  
Steps to reproduce: Play a long transcript.  
Expected result: Transcript scroll follows active subtitle.  
Actual result: Active word may be offscreen.  
Possible root cause: Missing synchronization effect.  
Suggested fix: Track active row ref and scroll with throttling; add user toggle.  
Estimated difficulty: Medium

### 27. Large transcript performance risk

Severity: High  
Category: Performance  
Description: All words render as inputs and all timeline captions render as spans. With 1,000-10,000 subtitles this can cause slow render, memory growth, and poor input latency. Evidence: `frontend/src/main.jsx:428`, `459-470`, `622-633`.  
Steps to reproduce: Load a long transcript with thousands of words.  
Expected result: Smooth editor via virtualization.  
Actual result: Likely heavy DOM and re-render cost.  
Possible root cause: No virtual list/timeline windowing.  
Suggested fix: Use virtualized transcript rows and timeline viewport culling.  
Estimated difficulty: Large

### 28. No file type/size pre-validation

Severity: Medium  
Category: Error Handling / UX  
Description: Upload accepts `video/*`, but backend copies the file then runs FFmpeg. No size limit, extension allowlist, or early unsupported format message. Evidence: `frontend/src/main.jsx:318-319`, `backend/app/storage.py:31-39`, `backend/app/transcription.py:22-45`.  
Steps to reproduce: Upload corrupted or huge file.  
Expected result: Early validation, size warning, clear error.  
Actual result: Backend stores file then FFmpeg fails or long operation starts.  
Possible root cause: No upload validation layer.  
Suggested fix: Add MIME/extension/size validation and user-facing preflight.  
Estimated difficulty: Medium

### 29. No disk full / permission / read-only handling strategy

Severity: High  
Category: Error Handling  
Description: Storage writes assume success. `write_text`, `copyfileobj`, render output writes, and export writes are not wrapped in recovery messages. Evidence: `backend/app/storage.py:39`, `66`, `88`, `backend/app/subtitle_export.py:22-24`, `backend/app/rendering.py:159`.  
Steps to reproduce: Make storage read-only or fill disk, then upload/save/export.  
Expected result: Clear error with recovery action.  
Actual result: Likely 500 or generic failed request.  
Possible root cause: No filesystem exception mapping.  
Suggested fix: Centralize storage error handling and return structured error codes.  
Estimated difficulty: Medium

### 30. No project delete/recent/recovery workflow

Severity: Medium  
Category: Data / UX  
Description: Projects list/reopen exists, but no delete, duplicate, recent pinning, missing-media warning, broken project repair, or crash recovery.  
Steps to reproduce: Remove a source video or create many projects.  
Expected result: User can manage and repair project library.  
Actual result: App lists projects with limited actions.  
Possible root cause: Storage library is minimal.  
Suggested fix: Add project manager actions and integrity checks.  
Estimated difficulty: Medium

### 31. ASS escaping is incomplete

Severity: Medium  
Category: Rendering / Bug  
Description: Subtitle text is written into ASS dialogue without escaping `{}`, `\`, line breaks, or ASS override-sensitive characters. Evidence: `backend/app/rendering.py:154-159`, `_karaoke_word` at `162-163`.  
Steps to reproduce: Subtitle contains `{\\pos(0,0)}` or backslashes.  
Expected result: Text renders literally.  
Actual result: ASS parser may interpret or break formatting.  
Possible root cause: Missing ASS text escaping.  
Suggested fix: Escape ASS special characters and normalize line breaks.  
Estimated difficulty: Small

### 32. SRT/VTT export ignores word-level active timing

Severity: Low  
Category: Product / Logic  
Description: Export serializes whole segments only. If UI edits words as individual captions, exported SRT/VTT may not match word-level preview. Evidence: `backend/app/subtitle_export.py:34-56`.  
Steps to reproduce: Use one-word preview mode and export SRT.  
Expected result: Export mode matches selected granularity or user chooses segment/word export.  
Actual result: Segment-level export only.  
Possible root cause: No export granularity setting.  
Suggested fix: Add export mode: segment, word, grouped words-per-line.  
Estimated difficulty: Medium

### 33. Aspect ratio selector is not wired

Severity: Medium  
Category: Bug / UX  
Description: Landing and topbar aspect ratio selectors do not persist to project or affect preview/render. Evidence: `frontend/src/main.jsx:331`, `386`.  
Steps to reproduce: Switch to 16:9 and render/preview.  
Expected result: Stage/render aspect changes.  
Actual result: No persistent effect.  
Possible root cause: Missing project settings state.  
Suggested fix: Store aspect ratio in project settings and map to preview frame/render scale/pad.  
Estimated difficulty: Medium

### 34. Playback speed selector is not wired

Severity: Low  
Category: Bug  
Description: Topbar speed selector has no `onChange` and does not set `video.playbackRate`. Evidence: `frontend/src/main.jsx:388`.  
Steps to reproduce: Change speed to 0.75x/1.25x.  
Expected result: Video playback speed changes.  
Actual result: No effect.  
Possible root cause: Static select.  
Suggested fix: Add playbackRate state and assign to video element.  
Estimated difficulty: Small

### 35. Landing YouTube URL field is not wired

Severity: Low  
Category: Missing Feature / UX  
Description: YouTube URL input has no state or submit action. Evidence: `frontend/src/main.jsx:321-323`.  
Steps to reproduce: Paste a YouTube URL and click create project.  
Expected result: Download/import flow starts or feature is disabled.  
Actual result: Field is ignored.  
Possible root cause: Placeholder UI.  
Suggested fix: Hide until supported, or implement URL ingestion with clear legal/error messaging.  
Estimated difficulty: Large

### 36. No tests

Severity: High  
Category: Technical Debt  
Description: No frontend test runner, backend test suite, E2E tests, fixture videos, or rendering regression tests are present. `package.json` has only dev/build/preview.  
Steps to reproduce: Try running `npm test` or backend tests.  
Expected result: Automated regression suite.  
Actual result: No tests available.  
Possible root cause: Prototype stage.  
Suggested fix: Add pytest API tests, frontend unit tests, and Playwright/Electron smoke tests with tiny media fixtures.  
Estimated difficulty: Large

## Top 20 Highest Priority Issues

1. Enabled UI controls do nothing.
2. No job/progress/cancel model for transcription.
3. No job/progress/cancel model for rendering.
4. No keyboard shortcuts.
5. No undo/redo.
6. Unsaved edits can be lost.
7. Timeline editing is mostly missing.
8. Thai render font defaults to Arial and differs from preview.
9. Preview/render visual mismatch.
10. Large transcript performance risk.
11. Project JSON corruption can break project listing.
12. Offline missing-model flow is not handled.
13. Disk/permission/storage failures are not mapped to user recovery.
14. Transcript delete/search/insert workflow incomplete.
15. Export naming/overwrite/cancel/progress missing.
16. BGM/SFX UI not connected to output.
17. Translation/autocorrect placeholders look like real features.
18. Upload validation missing for corrupted/huge/unsupported files.
19. Existing Thai project names need encoding repair.
20. No automated regression tests.

## Quick Wins

- Disable or hide nonfunctional buttons until implemented.
- Wire delete word, playback speed, mini scrubber, and preview zoom.
- Add `Noto Sans Thai` as frontend/backend default.
- Add ASS escaping for subtitle text.
- Add TXT export.
- Add corrupt-project guard in `list_projects()`.
- Add dirty-state tracking and `Ctrl+S` save.
- Add clear disabled/loading state for transcribe/render buttons.
- Add basic upload file size/type validation.
- Add project render filename timestamp to avoid silent overwrite.

## Technical Debt

- Single-file frontend app is becoming hard to maintain; split into player, transcript, timeline, inspector, project, and API modules.
- Backend operations need job orchestration instead of blocking HTTP requests.
- Data layer needs schema versioning, migration, backups, and repair tools.
- Rendering needs a shared style/layout contract with preview.
- No automated test foundation.
- Storage uses direct JSON files without transactional writes.
- Electron/native desktop integration is not implemented despite desktop-app expectations.

## Future Improvements

- Whisper model manager with offline cache validation and model download/import UI.
- WhisperX optional alignment/diarization path with clear hardware requirements.
- Virtualized transcript and timeline for 10,000+ captions.
- Native save dialogs, reveal-in-folder, and recent projects.
- Visual regression suite comparing preview frame to rendered video frame.
- Multi-language spell/spacing tools with Thai dictionary mode.
- Per-project settings panel for aspect ratio, render target, fonts, and default export naming.
- Accessibility pass: focus rings, aria labels, screen-reader names, keyboard-only workflow.

## Regression Test Recommendations

- API: health, upload valid video, upload corrupted video, missing project, corrupt JSON project, SRT/VTT/ASS/TXT export, render missing FFmpeg, render Unicode subtitle.
- Whisper: CPU int8 tiny/small, invalid model, missing cached model offline, CUDA unavailable fallback.
- Frontend: landing no overflow at 320/768/1440 widths, upload flow, project reopen, word edit/save/reload, keyboard shortcuts.
- Timeline: click seek, drag move, resize handles, snap, undo/redo, large transcript scroll.
- Rendering: Thai/English/emoji/numbers in Noto Sans Thai, vertical/horizontal video, style parity with preview.

