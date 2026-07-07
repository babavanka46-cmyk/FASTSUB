import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, FileText, Layout, Music2, Film, Maximize2 } from 'lucide-react';
import {
  formatPrecise,
  getActivePreviewWords,
  getSegmentText,
  getSegmentWordText,
  normalizeCaptionText,
} from '../subtitleUtils';
import { apiRequest, mediaUrl } from '../api';
import { getStoredString, setStoredString, storageKeys } from '../utils/editorStorage';
import { CaptionGapActions } from './CaptionGapActions';
import { SubtitleExpandedEditor } from './SubtitleExpandedEditor';
import { useEditor } from '../context/EditorContext';

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

export function getRowDraftValue(rowDrafts, row) {
  return Object.prototype.hasOwnProperty.call(rowDrafts, row.id) ? rowDrafts[row.id] : row.text;
}

export function createRowWordRefs(row) {
  const refs = row.words.map((word) => ({ segmentId: word.segmentId || row.id, wordId: word.id }));
  return refs.length ? refs : [{ segmentId: row.id }];
}

export function TranscriptPanel() {
  const {
    subtitles,
    activeWord,
    wordsPerLine,
    style,
    onStyle,
    currentTime,
    duration,
    onTime,
    onWordsPerLine,
    onWordChange,
    onRowTextChange,
    onDeleteWord,
    onDeleteRow,
    onAddSegment,
    onMergeSegments,
    onAddWord,
    onMergeWords,
    onSplitSegment,
    onAutocorrect,
    onRepairThai,
    isLoading,
    project,
    audioSettings,
    onAudioSettings,
    setToast,
  } = useEditor();
  const [activeTab, setActiveTab] = useState('transcript');
  const [expandedEditorOpen, setExpandedEditorOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [autocorrectProvider, setAutocorrectProvider] = useState('local');
  const [geminiApiKey, setGeminiApiKey] = useState(() => getStoredString(storageKeys.geminiApiKey, ''));
  const [rowDrafts, setRowDrafts] = useState({});
  const activeRowRef = useRef(null);
  const isLoadingAutocorrect = isLoading?.autocorrect || false;
  const isLoadingRepairThai = isLoading?.repairThai || false;
  const actionBusy = isLoadingAutocorrect || isLoadingRepairThai;

  useEffect(() => {
    setStoredString(storageKeys.geminiApiKey, geminiApiKey);
  }, [geminiApiKey]);

  // Auto scroll active row into view
  useEffect(() => {
    if (!activeWord && currentTime <= 0) return;
    activeRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeWord, currentTime]);

  const words = (subtitles?.segments || []).flatMap((segment) =>
    (segment.words || [])
      .filter((word) => String(word.text || '').trim())
      .map((word) => ({ ...word, segmentId: segment.id }))
  );
  const filteredWords = searchQuery
    ? words.filter((w) => w.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : words;
  const groupedRows = [];

  for (const segment of subtitles?.segments || []) {
    const segmentWords = (segment.words || [])
      .filter((word) => normalizeCaptionText(word.text))
      .map((word) => ({ ...word, segmentId: segment.id }));
    const visibleText = getSegmentText(segment);
    const wordText = getSegmentWordText({ ...segment, words: segmentWords });
    const rowText = visibleText || wordText;
    const matchesSearch = !searchQuery || rowText.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesSearch) continue;

    groupedRows.push({
      id: segment.id,
      start: Number(segment.start) || Number(segmentWords[0]?.start) || 0,
      end: Number(segment.end) || Number(segmentWords[segmentWords.length - 1]?.end) || 0,
      text: rowText,
      wordText,
      words: segmentWords,
      previewWords: getActivePreviewWords({ ...segment, words: segmentWords }),
    });
  }

  const handleAutocorrectClick = () => {
    onAutocorrect(autocorrectProvider, geminiApiKey);
  };

  const commitPanelRowDraft = (row) => {
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

  const discardPanelRowDraft = (row) => {
    setRowDrafts((current) => {
      if (!Object.prototype.hasOwnProperty.call(current, row.id)) return current;
      const updated = { ...current };
      delete updated[row.id];
      return updated;
    });
  };

  const autocorrectLabel = autocorrectProvider === 'local' ? 'จัดระเบียบช่องว่าง' : 'ตรวจคำด้วย Gemini AI';

  const videoSrc = mediaUrl(project?.source_video);
  const bgmSrc = mediaUrl(audioSettings?.bgm_path);
  const renderedVideoSrc = mediaUrl(project?.rendered_video);
  const lastSegmentId = subtitles?.segments?.[subtitles.segments.length - 1]?.id;

  return (
    <aside className="transcript-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <SubtitleExpandedEditor
        open={expandedEditorOpen}
        onClose={() => setExpandedEditorOpen(false)}
        project={project}
        groupedRows={groupedRows}
        activeWord={activeWord}
        wordsPerLine={wordsPerLine}
        onWordsPerLine={onWordsPerLine}
        searchQuery={searchQuery}
        onSearchQuery={setSearchQuery}
        currentTime={currentTime}
        duration={duration}
        onTime={onTime}
        style={style}
        onStyle={onStyle}
        onWordChange={onWordChange}
        onRowTextChange={onRowTextChange}
        onDeleteWord={onDeleteWord}
        onDeleteRow={onDeleteRow}
        onAddWord={onAddWord}
        onMergeSegments={onMergeSegments}
        onMergeWords={onMergeWords}
        onSplitSegment={onSplitSegment}
        actionBusy={actionBusy}
      />
      {/* Panel Tabs */}
      <div style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#09090a', flexShrink: 0 }}>
        {[
          { id: 'transcript', label: 'ถอดเสียง', icon: FileText },
          { id: 'captions', label: 'ซับ', icon: Layout },
          { id: 'media', label: 'มีเดีย', icon: Film },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            style={{
              flex: 1,
              padding: '9px 0',
              border: 0,
              background: 'transparent',
              color: activeTab === id ? '#d89443' : '#8d8d8d',
              fontSize: '11px',
              fontWeight: activeTab === id ? '800' : 'normal',
              cursor: 'pointer',
              borderBottom: activeTab === id ? '2px solid #d89443' : '2px solid transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '5px',
            }}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* TRANSCRIPT TAB */}
      {activeTab === 'transcript' && (
        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="panel-title" style={{ flexShrink: 0 }}>
            <div>
              <strong>ข้อความถอดเสียง</strong>
              <span>{filteredWords.length} เวิร์ด</span>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button className="icon-button soft" onClick={() => setExpandedEditorOpen(true)} title="เปิดหน้าต่างแก้ไขซับแบบเต็ม">
                <Maximize2 size={15} />
              </button>
              <button
                className="icon-button soft"
                onClick={() => lastSegmentId && onAddSegment?.(lastSegmentId)}
                disabled={actionBusy || !lastSegmentId}
                title={lastSegmentId ? 'เพิ่มช่วงซับใหม่หลังรายการสุดท้าย' : 'ยังไม่มีซับให้เพิ่มต่อ'}
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <label className="search-box" style={{ flexShrink: 0 }}>
            <Search size={14} />
            <input
              placeholder="ค้นหาข้อความซับ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </label>

          <div className="autocorrect-setup" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', margin: '4px 8px' }}>
            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#8d8d8d' }}>โมเดลตรวจคำ:</span>
              <select
                style={{ flex: 1, minHeight: '28px', fontSize: '12px', padding: '0 4px' }}
                value={autocorrectProvider}
                onChange={(e) => setAutocorrectProvider(e.target.value)}
                disabled={actionBusy}
              >
                <option value="local">จัดระเบียบช่องว่าง (Local)</option>
                <option value="gemini">แก้ไขสะกดคำด้วย Gemini AI</option>
              </select>
            </div>
            {autocorrectProvider === 'gemini' && (
              <input
                type="password"
                style={{ minHeight: '28px', fontSize: '12px', width: '100%' }}
                placeholder="ใส่คีย์ Gemini API..."
                value={geminiApiKey}
                onChange={(e) => setGeminiApiKey(e.target.value)}
                disabled={actionBusy}
              />
            )}
            <button className="button accent full" onClick={handleAutocorrectClick} disabled={actionBusy}>
              {isLoadingAutocorrect ? 'กำลังประมวลผล...' : autocorrectLabel}
            </button>
            <button
              className="button ghost full"
              onClick={onRepairThai}
              disabled={actionBusy}
              title="แบ่งคำไทยใหม่ด้วย PyThaiNLP"
            >
              {isLoadingRepairThai ? 'กำลังซ่อมคำไทย...' : 'ซ่อมการแบ่งคำไทย'}
            </button>
          </div>

          <div className="density-block" style={{ flexShrink: 0 }}>
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
          <div className="mode-row" style={{ flexShrink: 0 }}>
            <button className="active">โหมดบรรทัด</button>
          </div>
          <span className="hint-text" style={{ flexShrink: 0 }}>ใช้ {wordsPerLine} คำ/บรรทัดเมื่อสร้างแคปชั่นใหม่</span>

          <div className="word-list" style={{ flex: 1, overflowY: 'auto' }}>
                {groupedRows.map((row, index) => {
                  const isActive = row.words.some((w) => activeWord === w.id) || (currentTime >= row.start && currentTime <= row.end);
                  const lastWord = row.words[row.words.length - 1];
                  const nextRow = groupedRows[index + 1];
                  const nextFirstWord = nextRow ? nextRow.words[0] : null;

                  const handleMerge = nextRow
                    ? () => {
                        if (!lastWord || !nextFirstWord) {
                          onMergeSegments(row.id, nextRow.id);
                          return;
                        }

                        if (lastWord.segmentId !== nextFirstWord.segmentId) {
                          onMergeSegments(lastWord.segmentId, nextFirstWord.segmentId);
                        } else {
                          onMergeWords(lastWord.segmentId, lastWord.id, nextFirstWord.id);
                        }
                      }
                    : null;

                  return (
                    <React.Fragment key={row.id}>
                      <div ref={isActive ? activeRowRef : null} className={`word-row ${isActive ? 'active' : ''}`}>
                        <span className="word-index">{String(index + 1).padStart(2, '0')}</span>
                        <div className="word-main">
                          <small>{formatPrecise(row.start)} - {formatPrecise(row.end)}</small>
                          <input
                            value={getRowDraftValue(rowDrafts, row)}
                            onChange={(e) => {
                              setRowDrafts((current) => ({ ...current, [row.id]: e.target.value }));
                            }}
                            onBlur={() => commitPanelRowDraft(row)}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                commitPanelRowDraft(row);
                                event.currentTarget.blur();
                              } else if (event.key === 'Escape') {
                                event.preventDefault();
                                discardPanelRowDraft(row);
                                event.currentTarget.blur();
                              }
                            }}
                            disabled={actionBusy}
                          />
                        </div>
                        <button
                          onClick={() => {
                            onDeleteRow?.(row.id, row.words.map((item) => item.id));
                          }}
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
                          disabled={actionBusy}
                        >
                          ลบ
                        </button>
                      </div>

                      {index < groupedRows.length - 1 && (
                        <CaptionGapActions
                          onAdd={lastWord ? () => onAddWord(lastWord.id) : null}
                          onMerge={handleMerge}
                          label={row.text}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
                {groupedRows.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '24px', color: '#8d8d8d', fontSize: '12px' }}>
                    {words.length === 0 ? 'ยังไม่ได้ถอดเสียง — กดปุ่ม "ถอดเสียง AI" ในแถบบน' : 'ไม่พบข้อความที่ค้นหา'}
                  </div>
                )}
          </div>
        </div>
      )}

      {/* CAPTIONS TAB */}
      {activeTab === 'captions' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: '13px' }}>ซับไตเติล ({subtitles?.segments?.length || 0} ช่วง)</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', color: '#8d8d8d' }}>{wordsPerLine} คำ/บรรทัด</span>
              <button className="icon-button soft" onClick={() => setExpandedEditorOpen(true)} title="เปิดหน้าต่างแก้ไขซับแบบเต็ม">
                <Maximize2 size={15} />
              </button>
            </div>
          </div>
          {(subtitles?.segments || []).length === 0 && (
            <div style={{ textAlign: 'center', padding: '24px', color: '#8d8d8d', fontSize: '12px' }}>
              ยังไม่มีซับไตเติล — กดถอดเสียง AI ก่อน
            </div>
          )}
          {(subtitles?.segments || []).map((segment, segIdx) => (
            <React.Fragment key={segment.id}>
              <div
                style={{
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  padding: '8px 10px',
                  marginBottom: '6px',
                  background: 'rgba(30,30,32,0.4)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', color: '#8d8d8d' }}>Seg {segIdx + 1}</span>
                  <span style={{ fontSize: '11px', color: '#8d8d8d' }}>
                    {formatPrecise(segment.start)} → {formatPrecise(segment.end)}
                  </span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.45, color: '#dfdfdf' }}>{segment.text}</p>
                <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {(segment.words || []).filter((word) => String(word.text || '').trim()).map((word) => (
                    <span
                      key={word.id}
                      style={{
                        fontSize: '11px',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: activeWord === word.id ? 'rgba(216,148,67,0.2)' : 'rgba(255,255,255,0.04)',
                        color: activeWord === word.id ? '#d89443' : '#a0a0a0',
                        border: `1px solid ${activeWord === word.id ? 'rgba(216,148,67,0.3)' : 'rgba(255,255,255,0.06)'}`,
                      }}
                    >
                      {word.text}
                    </span>
                  ))}
                </div>
              </div>

              {segIdx < subtitles.segments.length - 1 && (
                <CaptionGapActions
                  onAdd={() => onAddSegment(segment.id)}
                  onMerge={() => onMergeSegments(segment.id, subtitles.segments[segIdx + 1].id)}
                  label={segment.text}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      )}

      {/* MEDIA TAB */}
      {activeTab === 'media' && (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <strong style={{ fontSize: '13px' }}>ไฟล์มีเดีย</strong>

          {/* Source Video */}
          <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px', background: 'rgba(30,30,32,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Film size={14} style={{ color: '#d89443' }} />
              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>วิดีโอต้นฉบับ</span>
            </div>
            {project ? (
              <>
                <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#8d8d8d', wordBreak: 'break-all' }}>{project.name}</p>
                <video
                  src={videoSrc}
                  controls
                  preload="none"
                  controlsList="nodownload"
                  style={{ width: '100%', borderRadius: '6px', maxHeight: '140px', objectFit: 'contain', background: '#000' }}
                />
              </>
            ) : (
              <span style={{ fontSize: '11px', color: '#8d8d8d' }}>ไม่มีวิดีโอ</span>
            )}
          </div>

          {/* BGM */}
          <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px', background: 'rgba(30,30,32,0.4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Music2 size={14} style={{ color: '#d89443' }} />
              <span style={{ fontSize: '12px', fontWeight: 'bold' }}>เพลงประกอบ (BGM)</span>
            </div>
            {audioSettings?.bgm_path ? (
              <>
                <p style={{ margin: '0 0 6px', fontSize: '11px', color: '#8d8d8d', wordBreak: 'break-all' }}>
                  {audioSettings.bgm_path.split('/').pop()}
                </p>
                <audio src={bgmSrc} controls style={{ width: '100%' }} />
                <div style={{ marginTop: '8px', display: 'flex', gap: '6px' }}>
                  <label style={{ fontSize: '11px', color: '#8d8d8d', flex: 1 }}>
                    Volume: {Math.round(audioSettings.bgm_volume * 100)}%
                    <input
                      type="range"
                      min="0" max="1" step="0.01"
                      value={audioSettings.bgm_volume}
                      onChange={(e) => onAudioSettings?.({ ...audioSettings, bgm_volume: Number(e.target.value) })}
                      style={{ width: '100%' }}
                    />
                  </label>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ fontSize: '11px', color: '#8d8d8d' }}>ยังไม่ได้เลือกเพลงประกอบ</span>
                <label
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '12px', padding: '6px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                >
                  <Music2 size={13} />
                  เลือกไฟล์เพลง (MP3/WAV/OGG)
                  <input
                    type="file"
                    accept="audio/*"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !project) return;
                      const form = new FormData();
                      form.append('file', file);
                      try {
                        const data = await apiRequest(`/api/project/${project.id}/assets/bgm`, { method: 'POST', body: form });
                        onAudioSettings?.({ ...audioSettings, bgm_path: data.path });
                        setToast?.('อัปโหลดเพลงประกอบแล้ว');
                      } catch (err) {
                        setToast?.(`อัปโหลดเพลงประกอบไม่สำเร็จ: ${err.message}`);
                      } finally {
                        e.target.value = '';
                      }
                    }}
                  />
                </label>
              </div>
            )}
          </div>

          {/* Rendered Output */}
          {renderedVideoSrc && (
            <div style={{ border: '1px solid rgba(255,255,255,0.06)', borderRadius: '10px', padding: '10px', background: 'rgba(30,30,32,0.4)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Film size={14} style={{ color: '#00e676' }} />
                <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#00e676' }}>วิดีโอที่เรนเดอร์แล้ว</span>
              </div>
              <video
                src={renderedVideoSrc}
                controls
                preload="none"
                controlsList="nodownload"
                style={{ width: '100%', borderRadius: '6px', maxHeight: '140px', objectFit: 'contain', background: '#000' }}
              />
              <a
                href={renderedVideoSrc}
                download
                style={{ display: 'block', marginTop: '8px', textAlign: 'center', fontSize: '12px', color: '#d89443', textDecoration: 'none', padding: '6px', borderRadius: '6px', background: 'rgba(216,148,67,0.08)', border: '1px solid rgba(216,148,67,0.15)' }}
              >
                ดาวน์โหลดวิดีโอ MP4
              </a>
            </div>
          )}
        </div>
      )}
    </aside>
  );
}
