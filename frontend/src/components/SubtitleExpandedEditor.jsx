import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Play, Pause, Scissors } from 'lucide-react';
import { formatPrecise, getActivePreviewWords, normalizeCaptionText } from '../subtitleUtils';
import { API } from '../api';
import { CaptionPreviewText } from './CaptionPreviewText';
import { CaptionGapActions } from './CaptionGapActions';
import { getRowDraftValue, createRowWordRefs } from './TranscriptPanel';

const modalFontList = ['Noto Sans Thai', 'Prompt', 'Kanit', 'Sarabun', 'Anuphan', 'IBM Plex Sans Thai'];

const positionPresets = {
  bottom: 18,
  middle: 43,
  top: 68,
};

function getPositionPreset(verticalOffset) {
  if (verticalOffset >= 58) return 'top';
  if (verticalOffset >= 34) return 'middle';
  return 'bottom';
}

function updateCaptionStyle(onStyle, section, patch) {
  if (!onStyle) return;

  onStyle((current) => {
    const updated = { ...(current || {}) };
    updated[section] = { ...(updated[section] || {}), ...patch };

    if (section === 'typography') {
      if (patch.fontFamily) updated.font_family = patch.fontFamily;
      if (patch.fontSize) updated.font_size = patch.fontSize;
      if (patch.fontWeight) updated.font_weight = patch.fontWeight;
      if (patch.lineHeight) updated.line_height = patch.lineHeight;
    } else if (section === 'position') {
      if (patch.verticalOffset !== undefined) updated.vertical_offset = patch.verticalOffset;
    } else if (section === 'fill') {
      if (patch.textColor) updated.text_color = patch.textColor;
      if (patch.activeColor) updated.active_color = patch.activeColor;
    }

    return updated;
  });
}

function shouldJoinCaptionTight(previous = '', current = '') {
  const thaiChar = /[\u0E00-\u0E7F]/;
  return (
    (thaiChar.test(previous) && thaiChar.test(current)) ||
    /^[,.;:!?%)]/.test(current) ||
    /[(]$/.test(previous)
  );
}

function buildWordTextRanges(words = []) {
  let text = '';
  const ranges = [];

  words.forEach((word) => {
    const part = String(word.text || '').trim();
    if (!part) return;

    const previous = text[text.length - 1] || '';
    const current = part[0] || '';
    const separator = text && !shouldJoinCaptionTight(previous, current) ? ' ' : '';
    const start = text.length + separator.length;
    text = `${text}${separator}${part}`;
    ranges.push({
      word,
      start,
      end: start + part.length,
      text: part,
    });
  });

  return { text, ranges };
}

function resolveCursorSplitRequest(row, cursorIndex) {
  const { text, ranges } = buildWordTextRanges(row.words);
  const rowText = String(row.text || '').trim();
  const wordText = String(text || '').trim();
  const cursor = Math.max(0, Math.min(Number(cursorIndex) || 0, rowText.length || wordText.length));

  if (row.id && rowText && normalizeCaptionText(rowText) !== normalizeCaptionText(wordText)) {
    return {
      type: 'text-cursor',
      segmentId: row.id,
      charOffset: cursor,
    };
  }

  if (!ranges.length) return null;

  let previousRange = null;

  for (const range of ranges) {
    if (cursor < range.start) {
      if (!previousRange) {
        return {
          type: 'before-word',
          segmentId: range.word.segmentId,
          wordId: range.word.id,
        };
      }
      return {
        type: 'boundary',
        segmentId: previousRange.word.segmentId,
        wordId: previousRange.word.id,
      };
    }

    if (cursor === range.start) {
      if (!previousRange) {
        return {
          type: 'before-word',
          segmentId: range.word.segmentId,
          wordId: range.word.id,
        };
      }
      return {
        type: 'boundary',
        segmentId: previousRange.word.segmentId,
        wordId: previousRange.word.id,
      };
    }

    if (cursor > range.start && cursor < range.end) {
      return {
        type: 'inside-word',
        segmentId: range.word.segmentId,
        wordId: range.word.id,
        charOffset: cursor - range.start,
      };
    }

    if (cursor === range.end) {
      return {
        type: 'boundary',
        segmentId: range.word.segmentId,
        wordId: range.word.id,
      };
    }

    previousRange = range;
  }

  return previousRange
    ? {
        type: 'boundary',
        segmentId: previousRange.word.segmentId,
        wordId: previousRange.word.id,
      }
    : null;
}

export function SubtitleExpandedEditor({
  open,
  onClose,
  project,
  groupedRows,
  activeWord,
  wordsPerLine,
  onWordsPerLine,
  searchQuery,
  onSearchQuery,
  currentTime,
  duration,
  onTime,
  style,
  onStyle,
  onWordChange,
  onRowTextChange,
  onDeleteWord,
  onAddWord,
  onMergeSegments,
  onMergeWords,
  onSplitSegment,
  actionBusy,
}) {
  const modalVideoRef = useRef(null);
  const rowInputRefs = useRef(new Map());
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [rowDrafts, setRowDrafts] = useState({});

  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const safeCurrentTime = Number.isFinite(currentTime) ? currentTime : 0;
  const videoSrc = project?.source_video ? `${API}/media/${project.source_video.replaceAll('\\', '/')}` : null;
  const currentFont = style?.typography?.fontFamily || style?.font_family || 'Noto Sans Thai';
  const currentFontSize = style?.typography?.fontSize || style?.font_size || 42;
  const currentVerticalOffset = style?.position?.verticalOffset ?? style?.vertical_offset ?? 25;
  const currentAlign = style?.position?.align || 'center';
  const activePreviewRow =
    groupedRows.find((row) => row.words.some((word) => word.id === activeWord)) ||
    groupedRows.find((row) => safeCurrentTime >= row.start && safeCurrentTime <= row.end) ||
    groupedRows[0];
  const previewWords = activePreviewRow?.previewWords || activePreviewRow?.words || [];

  useEffect(() => {
    if (!open) return undefined;
    const video = modalVideoRef.current;
    if (!video) return undefined;

    const handlePlay = () => setIsPreviewPlaying(true);
    const handlePause = () => setIsPreviewPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [open, videoSrc]);

  useEffect(() => {
    if (!open || !modalVideoRef.current) return;
    if (Math.abs(modalVideoRef.current.currentTime - safeCurrentTime) > 0.35) {
      modalVideoRef.current.currentTime = safeCurrentTime;
    }
  }, [open, safeCurrentTime]);

  if (!open) return null;

  const toggleModalPlayback = () => {
    const video = modalVideoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => setIsPreviewPlaying(false));
    } else {
      video.pause();
    }
  };

  const handleModalScrub = (event) => {
    if (!safeDuration) return;
    const nextTime = (Number(event.target.value) / 100) * safeDuration;
    if (modalVideoRef.current) modalVideoRef.current.currentTime = nextTime;
    onTime?.(nextTime);
  };

  const renderMerge = (row, nextRow) => {
    const lastWord = row.words[row.words.length - 1];
    const nextFirstWord = nextRow?.words?.[0];
    if (!row?.id || !nextRow?.id) return null;

    return () => {
      if (!lastWord || !nextFirstWord) {
        onMergeSegments(row.id, nextRow.id);
        return;
      }

      if (lastWord.segmentId !== nextFirstWord.segmentId) {
        onMergeSegments(lastWord.segmentId, nextFirstWord.segmentId);
      } else {
        onMergeWords(lastWord.segmentId, lastWord.id, nextFirstWord.id);
      }
    };
  };

  const handleSplitRow = (row) => {
    const input = rowInputRefs.current.get(row.id);
    const cursorIndex = input?.selectionStart ?? getRowDraftValue(rowDrafts, row).length;
    const request = resolveCursorSplitRequest(row, cursorIndex);
    if (!request) return;
    onSplitSegment?.(request);
  };

  const commitRowDraft = (row) => {
    const nextText = getRowDraftValue(rowDrafts, row);
    if (nextText !== row.text) {
      onRowTextChange?.(createRowWordRefs(row), nextText);
    }
    setRowDrafts((current) => {
      if (!Object.prototype.hasOwnProperty.call(current, row.id)) return current;
      const updated = { ...current };
      delete updated[row.id];
      return updated;
    });
  };

  const discardRowDraft = (row) => {
    setRowDrafts((current) => {
      if (!Object.prototype.hasOwnProperty.call(current, row.id)) return current;
      const updated = { ...current };
      delete updated[row.id];
      return updated;
    });
  };

  return (
    <div className="subtitle-editor-backdrop" role="dialog" aria-modal="true">
      <section className="subtitle-editor-modal">
        <header className="subtitle-editor-head">
          <div>
            <strong>แก้ไข Subtitle แบบเต็ม</strong>
            <span>{groupedRows.length} แถว • {wordsPerLine} คำ/บรรทัด</span>
          </div>
          <button className="icon-button soft" onClick={onClose} title="ปิดหน้าต่างแก้ไขซับ">
            <X size={17} />
          </button>
        </header>

        <div className="subtitle-editor-toolbar">
          <label className="search-box subtitle-editor-search">
            <Search size={15} />
            <input
              placeholder="ค้นหาข้อความซับ..."
              value={searchQuery}
              onChange={(event) => onSearchQuery(event.target.value)}
            />
          </label>

          <div className="subtitle-editor-stylebar" aria-label="Subtitle style controls">
            <label className="subtitle-style-control wide">
              <span>ฟอนต์</span>
              <select
                value={currentFont}
                onChange={(event) => updateCaptionStyle(onStyle, 'typography', { fontFamily: event.target.value })}
                disabled={actionBusy}
              >
                {modalFontList.map((font) => (
                  <option key={font} value={font}>{font}</option>
                ))}
              </select>
            </label>

            <label className="subtitle-style-control compact">
              <span>ขนาด</span>
              <input
                type="number"
                min="24"
                max="96"
                value={currentFontSize}
                onChange={(event) => updateCaptionStyle(onStyle, 'typography', { fontSize: Math.max(24, Math.min(96, Number(event.target.value) || 42)) })}
                disabled={actionBusy}
              />
            </label>

            <label className="subtitle-style-control">
              <span>ตำแหน่ง</span>
              <select
                value={getPositionPreset(currentVerticalOffset)}
                onChange={(event) => updateCaptionStyle(onStyle, 'position', { verticalOffset: positionPresets[event.target.value] })}
                disabled={actionBusy}
              >
                <option value="bottom">ล่าง</option>
                <option value="middle">กลาง</option>
                <option value="top">บน</option>
              </select>
            </label>

            <label className="subtitle-style-control">
              <span>จัดแนว</span>
              <select
                value={currentAlign}
                onChange={(event) => updateCaptionStyle(onStyle, 'position', { align: event.target.value })}
                disabled={actionBusy}
              >
                <option value="left">ซ้าย</option>
                <option value="center">กลาง</option>
                <option value="right">ขวา</option>
              </select>
            </label>
          </div>

          <div className="density-block subtitle-editor-density">
            <span>คำ/บรรทัด</span>
            <div className="segmented">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  className={wordsPerLine === value ? 'active' : ''}
                  onClick={() => onWordsPerLine(value)}
                  disabled={actionBusy}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="subtitle-editor-body">
          <div className="subtitle-editor-preview">
            <div className="subtitle-editor-phone">
              {videoSrc ? (
                <video
                  ref={modalVideoRef}
                  className="subtitle-editor-video"
                  src={videoSrc}
                  onTimeUpdate={(event) => onTime?.(event.currentTarget.currentTime)}
                />
              ) : (
                <div className="subtitle-editor-video-placeholder">ไม่มีวิดีโอ</div>
              )}
              <div className="subtitle-safe-box" aria-hidden="true" />
              <CaptionPreviewText
                previewWords={previewWords}
                activeWord={activeWord}
                style={style}
              />
            </div>
            <div className="subtitle-editor-mini-controls">
              <button className="icon-button soft" onClick={toggleModalPlayback} disabled={!videoSrc} title={isPreviewPlaying ? 'หยุดวิดีโอ' : 'เล่นวิดีโอ'}>
                {isPreviewPlaying ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <input
                type="range"
                min="0"
                max="100"
                value={safeDuration ? (safeCurrentTime / safeDuration) * 100 : 0}
                onChange={handleModalScrub}
                disabled={!videoSrc || !safeDuration}
              />
              <span>{formatPrecise(safeCurrentTime)} / {formatPrecise(safeDuration)}</span>
            </div>
          </div>

          <div className="subtitle-editor-list">
            <div className="subtitle-editor-list-head">
              <span>Time Code</span>
              <span>Speaker/Subtitles</span>
              <span>operate</span>
            </div>

            <div className="subtitle-editor-scroll">
              {groupedRows.map((row, index) => {
                const isActive = row.words.some((word) => activeWord === word.id) || (safeCurrentTime >= row.start && safeCurrentTime <= row.end);
                const nextRow = groupedRows[index + 1];
                const lastWord = row.words[row.words.length - 1];
                const canSplitRow = Boolean(onSplitSegment && String(row.text || '').trim().length > 1);

                return (
                  <React.Fragment key={row.id}>
                    <div className={`subtitle-editor-row ${isActive ? 'active' : ''}`}>
                      <div className="subtitle-editor-time">
                        <span>{formatPrecise(row.start)}</span>
                        <small>{formatPrecise(row.end)}</small>
                      </div>
                      <input
                        ref={(node) => {
                          if (node) rowInputRefs.current.set(row.id, node);
                          else rowInputRefs.current.delete(row.id);
                        }}
                        value={getRowDraftValue(rowDrafts, row)}
                        onChange={(event) => {
                          setRowDrafts((current) => ({ ...current, [row.id]: event.target.value }));
                        }}
                        onBlur={() => commitRowDraft(row)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault();
                            commitRowDraft(row);
                            event.currentTarget.blur();
                          } else if (event.key === 'Escape') {
                            event.preventDefault();
                            discardRowDraft(row);
                            event.currentTarget.blur();
                          }
                        }}
                        disabled={actionBusy}
                      />
                      <div className="subtitle-editor-actions">
                        <button
                          className="subtitle-editor-split"
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => handleSplitRow(row)}
                          disabled={actionBusy || !onSplitSegment}
                          title={canSplitRow ? 'แยกตามตำแหน่งเคอร์เซอร์' : 'แยกตามตำแหน่งเคอร์เซอร์ หรือแยกกลางคำ'}
                        >
                          <Scissors size={13} />
                          แยก
                        </button>
                        <button
                          className="subtitle-editor-delete"
                          onClick={() => {
                            row.words.forEach((word) => onDeleteWord(word.segmentId, word.id));
                          }}
                          disabled={actionBusy}
                        >
                          ลบ
                        </button>
                      </div>
                    </div>

                    {index < groupedRows.length - 1 && (
                      <CaptionGapActions
                        alwaysVisible
                        onAdd={lastWord ? () => onAddWord(lastWord.id) : null}
                        onMerge={renderMerge(row, nextRow)}
                        label={row.text}
                      />
                    )}
                  </React.Fragment>
                );
              })}

              {groupedRows.length === 0 && (
                <div className="subtitle-editor-empty">ไม่พบข้อความที่ค้นหา</div>
              )}
            </div>
          </div>
        </div>

        <footer className="subtitle-editor-footer">
          <button className="button ghost" onClick={onClose}>ปิด</button>
          <button className="button accent" onClick={onClose}>เสร็จสิ้น</button>
        </footer>
      </section>
    </div>
  );
}

export default SubtitleExpandedEditor;
