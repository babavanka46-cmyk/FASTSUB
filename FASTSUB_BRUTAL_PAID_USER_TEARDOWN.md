# FASTSUB Brutal Paid-User Teardown

Perspective: impatient user who paid $99 and compares FASTSUB against CapCut, Adobe Premiere, and modern AI subtitle tools.  
Rule: no compliments, only uninstall reasons and concrete fixes.

## Verdict

Would I recommend FASTSUB to professionals today? **No.**

At $99, this feels like a prototype wrapped in a professional-looking shell. The core idea is valuable, but the experience breaks trust fast: too many buttons do nothing, editing workflows are incomplete, long AI/render jobs have no real progress, and the output pipeline does not yet guarantee that preview equals final render. A professional user will uninstall once they realize they cannot reliably edit, undo, export, recover, or predict the final video.

## Scoring Scale

Severity: 1 low, 5 critical  
Frequency: 1 rare, 5 constant  
Business Impact: 1 minor, 5 refund/uninstall risk  
Engineering Cost: 1 small, 5 large  
User Frustration: 1 mild, 5 rage quit

## Paid-User Reasons To Uninstall

### 1. The app sells an editor but behaves like a mockup

Severity: 5  
Frequency: 5  
Business Impact: 5  
Engineering Cost: 3  
User Frustration: 5  

Problem: Many visible editor controls do nothing: delete word, split, merge, insert, preview zoom, full screen, translation, BGM, SFX, panel collapse, extra tool buttons. A paying user interprets this as deception, not missing polish.

Why it matters: CapCut does not let users click dead controls in core workflows. Adobe may be complex, but enabled controls generally mean something.

Solution: Remove, disable, or implement every fake control. No enabled button should be decorative. Add tooltips only for implemented controls, not excuses.

### 2. No undo/redo means the editor is unsafe

Severity: 5  
Frequency: 5  
Business Impact: 5  
Engineering Cost: 4  
User Frustration: 5  

Problem: Any serious subtitle edit can become destructive. Ctrl+Z/Ctrl+Y do not provide app-level safety.

Why it matters: Professionals experiment quickly. Without undo, they slow down or leave.

Solution: Implement command-based history for word edits, delete, split, merge, timing changes, style changes, and transcript operations.

### 3. No autosave or recovery is unacceptable for paid desktop software

Severity: 5  
Frequency: 4  
Business Impact: 5  
Engineering Cost: 3  
User Frustration: 5  

Problem: Manual save exists, but dirty-state tracking and crash recovery do not. The UI even implies changes exist without actually managing them properly.

Why it matters: Losing subtitle edits is a refund event.

Solution: Add debounced autosave, visible save status, project snapshots, recovery drafts, and a confirmation before closing with unsaved changes.

### 4. Whisper jobs feel like a black box

Severity: 5  
Frequency: 4  
Business Impact: 5  
Engineering Cost: 5  
User Frustration: 5  

Problem: Transcription starts and the user waits. No percentage, ETA, current stage, cancel, retry, or partial output.

Why it matters: AI tools must make waiting feel controlled. CapCut gives visible task state; professional tools queue jobs.

Solution: Create background transcription jobs with progress, ETA, cancel, retry, stage labels, model loading state, and model-cache warnings.

### 5. Rendering also feels like a black box

Severity: 5  
Frequency: 4  
Business Impact: 5  
Engineering Cost: 4  
User Frustration: 5  

Problem: Render is synchronous. No FFmpeg progress, no cancel, no queue, no remaining time.

Why it matters: Video render is a high-anxiety step. Users need confidence that the app is alive.

Solution: Use FFmpeg `-progress`, job ids, cancellation, render history, and clear output location.

### 6. Preview cannot be trusted as final output

Severity: 5  
Frequency: 4  
Business Impact: 5  
Engineering Cost: 5  
User Frustration: 5  

Problem: Browser preview and ASS render use different layout engines. Font, shadow, offset, active word behavior, and line breaking can differ.

Why it matters: If final export surprises the user, the editor is useless.

Solution: Build a single subtitle layout contract. Every style property must map identically to preview and render. Add visual regression tests comparing preview frames to rendered frames.

### 7. Thai typography is not premium

Severity: 4  
Frequency: 5  
Business Impact: 4  
Engineering Cost: 2  
User Frustration: 4  

Problem: The product targets Thai subtitles, but defaults are not built around Thai typography. Backend render default uses Arial. Frontend uses Inter. This screams prototype.

Why it matters: Thai creators judge the result immediately by text shape, spacing, tone marks, and readability.

Solution: Use bundled `Noto Sans Thai` as default. Offer `Anuphan`, `Prompt`, `Kanit`, `IBM Plex Sans Thai`, `Sarabun`. Bundle font files and pass them to FFmpeg.

### 8. Transcript editing is too primitive

Severity: 5  
Frequency: 5  
Business Impact: 5  
Engineering Cost: 4  
User Frustration: 5  

Problem: Users can edit word text, but cannot properly delete, split, merge, replace, duplicate, multiselect, copy/paste, or edit timestamps.

Why it matters: Subtitle correction is the product. If correction is weak, the whole app fails.

Solution: Build a transcript editor with segment and word modes, inline timing edits, multiselect, search/replace, copy/paste, delete confirmation, and keyboard navigation.

### 9. Search box is fake

Severity: 3  
Frequency: 4  
Business Impact: 3  
Engineering Cost: 2  
User Frustration: 4  

Problem: Search UI accepts typing but does not search.

Why it matters: A transcript editor without search is a toy.

Solution: Add search state, highlights, result count, next/previous, replace, and scope filters.

### 10. Timeline is not an editor

Severity: 5  
Frequency: 5  
Business Impact: 5  
Engineering Cost: 5  
User Frustration: 5  

Problem: Timeline shows chips and click-to-seek. Users cannot drag captions, resize durations, snap, trim, move, insert gaps, or select groups.

Why it matters: CapCut users expect direct manipulation. Adobe users expect precision. FASTSUB offers neither.

Solution: Build a real timeline: draggable caption blocks, resize handles, snapping, zoom, scroll, selection, keyboard nudging, and undoable timing operations.

### 11. Keyboard workflow is missing

Severity: 4  
Frequency: 5  
Business Impact: 4  
Engineering Cost: 3  
User Frustration: 5  

Problem: Space, Delete, Ctrl+S, Ctrl+Z, Ctrl+Y, arrow keys, Home/End, Ctrl+C/V/A are not implemented as app commands.

Why it matters: Professionals do not click everything. Slow keyboard workflow makes the app feel amateur.

Solution: Add focus-aware shortcut manager and visible shortcut hints in tooltips/menus.

### 12. The landing page has unresolved fake flows

Severity: 3  
Frequency: 4  
Business Impact: 3  
Engineering Cost: 2  
User Frustration: 3  

Problem: YouTube URL exists but is ignored. Create project is just another file input. Mode/aspect/language selections do not clearly persist into the project.

Why it matters: First-run trust is fragile. Fake inputs create doubt immediately.

Solution: Keep only supported flows. If YouTube import is unsupported, remove it. Make project creation a clear wizard: source, language/model, aspect ratio, subtitle mode.

### 13. The product has no professional project management

Severity: 4  
Frequency: 4  
Business Impact: 4  
Engineering Cost: 3  
User Frustration: 4  

Problem: No delete, duplicate, rename, reveal in folder, missing media repair, archive, project thumbnails, or recent/favorite handling.

Why it matters: Professionals manage many jobs. A dropdown of filenames is not enough.

Solution: Create a project dashboard with thumbnails, status, last edited, actions, search, and repair warnings.

### 14. Export workflow is not professional

Severity: 5  
Frequency: 4  
Business Impact: 5  
Engineering Cost: 4  
User Frustration: 5  

Problem: Export opens browser URLs, fixed filenames overwrite previous files, TXT is missing, there is no destination picker, no overwrite warning, no export presets.

Why it matters: Export is where users judge whether the app paid for itself.

Solution: Add export modal with format, destination, filename template, overwrite handling, render queue, and open/reveal actions.

### 15. BGM and SFX are marketing without delivery

Severity: 4  
Frequency: 3  
Business Impact: 4  
Engineering Cost: 5  
User Frustration: 4  

Problem: The UI advertises music and sound effects, but the frontend does not wire BGM selection to render, and SFX is not actually implemented.

Why it matters: Users will feel baited.

Solution: Either remove these features before v1 or implement asset import, timeline placement, volume automation, preview playback, and final mixdown.

### 16. Translation is fake

Severity: 4  
Frequency: 3  
Business Impact: 4  
Engineering Cost: 4  
User Frustration: 4  

Problem: Translation UI is not wired; backend placeholder only prefixes language code.

Why it matters: AI subtitle apps are expected to translate meaningfully.

Solution: Hide translation or implement real provider selection with local/online labels, cost disclosure, and review workflow.

### 17. Autocorrect is misleading

Severity: 3  
Frequency: 4  
Business Impact: 3  
Engineering Cost: 3  
User Frustration: 4  

Problem: Local autocorrect normalizes spacing; it does not truly correct Thai grammar/spelling.

Why it matters: The label overpromises.

Solution: Rename to "จัดคำ/เว้นวรรค" or implement a real Thai correction model/dictionary.

### 18. Error handling is not buyer-grade

Severity: 5  
Frequency: 3  
Business Impact: 5  
Engineering Cost: 3  
User Frustration: 5  

Problem: Missing FFmpeg, missing model, no GPU, permission denied, disk full, corrupted video, and broken project states do not have guided recovery flows.

Why it matters: Paid users do not read stack traces. They expect the app to tell them what to do.

Solution: Add structured error codes, user-facing recovery dialogs, diagnostics screen, and one-click checks.

### 19. Offline promise is risky

Severity: 5  
Frequency: 3  
Business Impact: 5  
Engineering Cost: 4  
User Frustration: 5  

Problem: Faster-Whisper may need a model download the first time. The app says local/offline but does not manage model availability.

Why it matters: "Offline" must mean predictable offline operation.

Solution: Add model manager: installed models, missing models, import local model, download queue, storage size, and offline readiness check.

### 20. Performance will collapse on large transcripts

Severity: 5  
Frequency: 3  
Business Impact: 5  
Engineering Cost: 5  
User Frustration: 5  

Problem: All words render as input rows and timeline chips. Long videos can create thousands of DOM elements.

Why it matters: Professionals work on long content.

Solution: Virtualize transcript rows, window timeline captions, debounce edits, memoize rows, and test 100/1,000/10,000 caption projects.

### 21. No accessibility baseline

Severity: 3  
Frequency: 4  
Business Impact: 3  
Engineering Cost: 3  
User Frustration: 3  

Problem: Many icon buttons rely on title only or no accessible label. Focus behavior is undefined.

Why it matters: Keyboard-heavy creators and accessibility users will struggle.

Solution: Add aria labels, visible focus states, semantic roles, and keyboard navigation.

### 22. Window resize and responsive editor are not production-grade

Severity: 3  
Frequency: 4  
Business Impact: 3  
Engineering Cost: 3  
User Frustration: 4  

Problem: First page overflow was fixed, but the editor still has dense topbars and many small controls that can wrap awkwardly.

Why it matters: Desktop app windows are resized constantly.

Solution: Use adaptive layouts: collapsible topbar groups, command palette, responsive side panels, and minimum editor dimensions.

### 23. Style panel is too shallow for paid users

Severity: 3  
Frequency: 4  
Business Impact: 3  
Engineering Cost: 4  
User Frustration: 3  

Problem: No real font selector, line spacing, letter spacing, stroke width, shadow controls, background controls, alignment, opacity, reset, duplicate, save/load presets.

Why it matters: Subtitle style is a creator differentiator.

Solution: Build a complete style inspector with live preview, preset library, custom presets, and render parity.

### 24. No professional onboarding or diagnostics

Severity: 4  
Frequency: 3  
Business Impact: 4  
Engineering Cost: 3  
User Frustration: 4  

Problem: Users do not know whether FFmpeg, GPU, models, fonts, storage, and permissions are ready.

Why it matters: Local AI apps fail for environment reasons.

Solution: First-run checklist: FFmpeg found, model installed, GPU available, write permission OK, sample render OK.

### 25. Data storage has no migration/repair story

Severity: 4  
Frequency: 3  
Business Impact: 4  
Engineering Cost: 3  
User Frustration: 4  

Problem: JSON files can corrupt, old Thai filenames already show mojibake, and there is no version migration.

Why it matters: Old projects must remain openable after updates.

Solution: Add schema versions, migrations, backup-before-write, atomic writes, project repair, encoding repair.

## Redesign The Workflow

### Current Problem

The app starts with a visual promise of a full video editor, but the workflow is fragmented:

1. Upload.
2. Wait without proper progress.
3. Click around many dead controls.
4. Edit words in a long list.
5. Guess whether preview equals export.
6. Render without progress.
7. Browser opens an output URL.

That is not a $99 workflow.

### Version 1 Workflow

1. **New Project Wizard**
   - Choose video.
   - Choose language or auto detect.
   - Choose model preset: Fast, Balanced, Accurate.
   - Confirm offline model availability.
   - Choose aspect ratio.

2. **Transcription Job Screen**
   - Show model loading, audio extraction, transcription, alignment, Thai segmentation.
   - Show progress, ETA, cancel, retry.
   - Allow user to start editing completed segments while job continues if possible.

3. **Editor**
   - Left: virtualized transcript with search/replace.
   - Center: preview with reliable playback, subtitle safe area, zoom/fullscreen.
   - Bottom: real editable timeline.
   - Right: style/export inspector.
   - Top: project status, save status, render queue.

4. **Review Tools**
   - Spell/spacing review.
   - Low-confidence words.
   - Jump to silence/overlap/timing warnings.

5. **Export Modal**
   - Burned MP4, soft subtitle MP4, SRT, VTT, ASS, TXT.
   - Destination and filename.
   - Preview final frame.
   - Render progress.
   - Reveal output.

## Redesign The UI

### Remove visual lies

Every visible control must be one of:

- Fully working.
- Disabled with clear reason.
- Hidden.

No fake chips. No fake buttons. No decorative controls that look interactive.

### Replace clutter with command groups

Topbar should not be a row of unrelated pills/selects. Use:

- Project status area.
- Transcription settings popover.
- Playback controls near preview.
- Export button with modal.
- Command palette for secondary actions.

### Make typography Thai-first

Default:

- Font: `Noto Sans Thai`
- Subtitle weight: 800
- Preview text size: based on video frame, not viewport only
- Controls: use same Thai UI font across app

Add font preview cards with Thai + English + numbers:

`ภาษาไทย 123 FASTSUB`

### Make disabled states obvious

Before upload:

- Editor controls disabled.
- Clear empty state.
- One primary action only: Upload video.

During transcription/render:

- Lock destructive actions.
- Show cancel.
- Preserve navigation.

## Must Be Fixed Before Version 1.0

1. Remove or implement all fake controls.
2. Implement undo/redo.
3. Implement autosave and crash recovery.
4. Implement transcription jobs with progress/cancel/retry.
5. Implement render jobs with FFmpeg progress/cancel.
6. Make preview and render visually consistent.
7. Bundle and use Thai fonts, default `Noto Sans Thai`.
8. Build real transcript delete/split/merge/search/replace.
9. Build editable timeline with drag/resize/snap.
10. Add keyboard shortcuts.
11. Add export modal with filenames, location, overwrite, TXT.
12. Add project management: rename/delete/duplicate/reveal/repair.
13. Add offline model manager.
14. Add FFmpeg/model/GPU/storage diagnostics.
15. Add upload validation.
16. Add BGM/SFX only if fully wired; otherwise remove.
17. Replace fake translation/autocorrect labels or implement real features.
18. Add large-project performance virtualization.
19. Add data migration and corrupted-project recovery.
20. Add automated regression tests.

## Complete Release Checklist

### Product Honesty

- [ ] No enabled control is nonfunctional.
- [ ] All incomplete features are hidden behind feature flags.
- [ ] All disabled controls explain why they are disabled.
- [ ] Landing page only shows supported flows.
- [ ] Pricing/product copy matches actual feature set.

### First Run

- [ ] FFmpeg detection.
- [ ] Faster-Whisper import check.
- [ ] Installed model list.
- [ ] Offline readiness status.
- [ ] GPU/CUDA availability check.
- [ ] Storage write permission check.
- [ ] Sample Thai font render check.
- [ ] First-run setup screen.

### Upload

- [ ] File size validation.
- [ ] File type validation.
- [ ] Corrupted video handling.
- [ ] Unsupported format error.
- [ ] Large file warning.
- [ ] Replace video confirmation.
- [ ] Thai/emoji filename handling.
- [ ] Upload progress.

### Whisper

- [ ] Fast/Balanced/Accurate presets.
- [ ] Tiny/base/small/medium/large model support or clear limitation.
- [ ] CPU/GPU validation.
- [ ] INT8/FP16 compatibility validation.
- [ ] Local model manager.
- [ ] Transcription progress.
- [ ] Cancel transcription.
- [ ] Retry transcription.
- [ ] Language auto detect.
- [ ] Thai segmentation.
- [ ] Mixed-language handling.
- [ ] Corrupt audio handling.
- [ ] Missing model recovery.

### Player

- [ ] Play/pause toggle.
- [ ] Spacebar play/pause.
- [ ] Replay.
- [ ] Seek bar bound to real time.
- [ ] Drag scrubber.
- [ ] Frame step backward/forward.
- [ ] Volume.
- [ ] Mute.
- [ ] Playback speed.
- [ ] Loop.
- [ ] Loading spinner.
- [ ] Video error state.
- [ ] Aspect ratio handling.
- [ ] Zoom.
- [ ] Fullscreen.
- [ ] Safe area overlay.

### Transcript

- [ ] Word edit.
- [ ] Segment edit.
- [ ] Delete word.
- [ ] Delete segment.
- [ ] Insert word.
- [ ] Insert segment.
- [ ] Split segment.
- [ ] Merge segment.
- [ ] Search.
- [ ] Replace.
- [ ] Multiselect.
- [ ] Copy.
- [ ] Paste.
- [ ] Duplicate.
- [ ] Undo.
- [ ] Redo.
- [ ] Auto-scroll active subtitle.
- [ ] Timestamp edit.
- [ ] Empty transcript state.
- [ ] Long transcript virtualization.
- [ ] Thai/emoji/mixed-language tests.

### Timeline

- [ ] Click seek.
- [ ] Drag playhead.
- [ ] Drag caption.
- [ ] Resize caption start/end.
- [ ] Snap to playhead/neighbor/grid.
- [ ] Zoom.
- [ ] Horizontal scroll.
- [ ] Multiselect.
- [ ] Delete selected.
- [ ] Insert gap.
- [ ] Move group.
- [ ] Right-click menu.
- [ ] Keyboard nudging.
- [ ] Undo/redo.
- [ ] Performance test with 10,000 captions.

### Style

- [ ] `Noto Sans Thai` default.
- [ ] Font selector.
- [ ] Bundled font files.
- [ ] Font preview samples.
- [ ] Font size.
- [ ] Weight.
- [ ] Bold/italic where supported.
- [ ] Stroke width.
- [ ] Outline color.
- [ ] Shadow color/blur/offset.
- [ ] Background box.
- [ ] Opacity.
- [ ] Alignment.
- [ ] Line spacing.
- [ ] Letter spacing.
- [ ] Safe area.
- [ ] Reset style.
- [ ] Save preset.
- [ ] Load preset.
- [ ] Preview/render parity tests.

### Export

- [ ] MP4 burned subtitles.
- [ ] MP4 soft subtitles.
- [ ] SRT.
- [ ] VTT.
- [ ] ASS.
- [ ] TXT.
- [ ] Destination picker.
- [ ] Filename template.
- [ ] Overwrite warning.
- [ ] Render progress.
- [ ] Cancel render.
- [ ] Retry failed render.
- [ ] Reveal in folder.
- [ ] Thai filename output.
- [ ] Emoji filename output.
- [ ] Windows path tests.
- [ ] macOS path tests if shipped.
- [ ] Linux path tests if shipped.

### Project Data

- [ ] Atomic JSON writes.
- [ ] Schema version.
- [ ] Migration tests.
- [ ] Corrupt project quarantine.
- [ ] Project repair UI.
- [ ] Autosave.
- [ ] Recovery snapshots.
- [ ] Dirty state.
- [ ] Project rename.
- [ ] Project delete.
- [ ] Project duplicate.
- [ ] Recent projects.
- [ ] Missing media warning.

### Error Handling

- [ ] Missing FFmpeg.
- [ ] Missing Whisper model.
- [ ] No internet on first model install.
- [ ] No GPU.
- [ ] CUDA incompatible.
- [ ] Disk full.
- [ ] Permission denied.
- [ ] Read-only folder.
- [ ] Corrupted video.
- [ ] Empty subtitle.
- [ ] Broken JSON.
- [ ] Export path unavailable.
- [ ] User-facing recovery action for every error.

### Performance

- [ ] 100 subtitles smooth.
- [ ] 1,000 subtitles smooth.
- [ ] 10,000 subtitles usable.
- [ ] Long video transcription job stable.
- [ ] Long video render stable.
- [ ] Memory usage measured.
- [ ] No uncontrolled model cache growth.
- [ ] No UI freeze during jobs.
- [ ] Timeline virtualization.
- [ ] Transcript virtualization.

### QA Automation

- [ ] Backend pytest suite.
- [ ] Frontend unit tests.
- [ ] E2E editor smoke tests.
- [ ] Fixture video files.
- [ ] Thai render golden samples.
- [ ] Preview vs render frame comparison.
- [ ] Keyboard shortcut tests.
- [ ] Corrupt storage tests.
- [ ] Export format validation.
- [ ] Build pipeline blocks release on test failure.

## Final Paid-User Recommendation

Do not sell this as Version 1.0 yet. Sell it only as alpha/beta if expectations are clear.

Before professionals should pay for it, FASTSUB must become a reliable subtitle editor, not just a transcription demo with a stylish interface. The minimum bar is simple: real editing, real undo, real progress, real export control, Thai-first typography, and no fake buttons.

