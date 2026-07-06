import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { formatPrecise, joinCaptionText } from '../subtitleUtils';
import { API } from '../api';
import { CaptionPreviewText } from './CaptionPreviewText';
import { getBackgroundStyle, getFontStyle, getShadowStyle, getStrokeStyle } from '../utils/captionStyle';
import { useEditor } from '../context/EditorContext';

export function PreviewPanel() {
  const {
    project,
    previewWords,
    activeWord,
    activeSegment,
    style,
    onStyle,
    videoRef,
    onTime,
    onDurationChange,
    currentTime,
    duration,
    onRowTextChange,
  } = useEditor();
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [playbackRate, setPlaybackRate] = useState(1);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isEditingSubtitle, setIsEditingSubtitle] = useState(false);
  const [subtitleDraft, setSubtitleDraft] = useState('');
  const stageRef = useRef(null);
  const subtitleEditRef = useRef(null);

  const src = `${API}/media/${project.source_video.replaceAll('\\', '/')}`;
  const previewText = joinCaptionText((previewWords || []).map((word) => word.text));
  const canEditPreview = Boolean(onRowTextChange && activeSegment?.id && previewWords?.length);
  const verticalOffset = style?.position?.verticalOffset ?? style?.vertical_offset ?? 25;
  const align = style?.position?.align || 'center';
  const fontStyle = getFontStyle(style);
  const strokeStyle = getStrokeStyle(style);
  const shadowStyle = getShadowStyle(style);
  const backgroundStyle = getBackgroundStyle(style);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [videoRef]);

  // Keep playback rate synced
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, videoRef]);

  // Keep volume synced
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted, videoRef]);

  useEffect(() => {
    if (!isEditingSubtitle) return;
    subtitleEditRef.current?.focus();
    subtitleEditRef.current?.select();
  }, [isEditingSubtitle]);

  useEffect(() => {
    if (!isEditingSubtitle) return;
    setSubtitleDraft(previewText);
  }, [previewText, isEditingSubtitle]);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
  };

  const handleScrub = (event) => {
    if (!videoRef.current || !duration) return;
    const nextTime = (Number(event.target.value) / 100) * duration;
    videoRef.current.currentTime = nextTime;
    onTime(nextTime);
  };

  const handleZoom = (amount) => {
    setZoom((z) => Math.max(50, Math.min(200, z + amount)));
  };

  const handleFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      el.requestFullscreen?.();
    }
  };

  const startSubtitleEdit = () => {
    if (!canEditPreview) return;
    videoRef.current?.pause();
    setSubtitleDraft(previewText);
    setIsEditingSubtitle(true);
  };

  const cancelSubtitleEdit = () => {
    setSubtitleDraft(previewText);
    setIsEditingSubtitle(false);
  };

  const commitSubtitleEdit = () => {
    if (!canEditPreview) return;
    const nextText = subtitleDraft.trim();
    if (nextText && nextText !== previewText) {
      onRowTextChange(
        previewWords.map((word) => ({ segmentId: activeSegment.id, wordId: word.id })),
        nextText
      );
    }
    setIsEditingSubtitle(false);
  };

  const getPhoneFrameStyle = () => {
    const scale = zoom / 100;
    const isVertical = aspectRatio === '9:16';
    return {
      transform: `scale(${scale})`,
      transformOrigin: 'center center',
      transition: 'transform 0.15s ease',
      aspectRatio: isVertical ? '9/16' : '16/9',
      width: isVertical ? '320px' : '568px',
      maxHeight: '90%',
    };
  };

  const currentFont = style?.typography?.fontFamily || style?.font_family || 'Noto Sans Thai';
  const currentFontSize = style?.typography?.fontSize || style?.font_size || 42;
  const currentVerticalOffset = style?.position?.verticalOffset ?? style?.vertical_offset ?? 25;
  const currentAlign = style?.position?.align || 'center';

  const fontList = ['Noto Sans Thai', 'Prompt', 'Kanit', 'Sarabun', 'Anuphan', 'IBM Plex Sans Thai'];

  const updateStyle = (section, patch) => {
    if (!onStyle) return;
    onStyle((current) => {
      const updated = { ...(current || {}) };
      if (!updated[section]) updated[section] = {};
      updated[section] = { ...updated[section], ...patch };
      if (section === 'typography') {
        if (patch.fontFamily) updated.font_family = patch.fontFamily;
        if (patch.fontSize) updated.font_size = patch.fontSize;
        if (patch.fontWeight) updated.font_weight = patch.fontWeight;
        if (patch.lineHeight) updated.line_height = patch.lineHeight;
      } else if (section === 'position') {
        if (patch.verticalOffset !== undefined) updated.vertical_offset = patch.verticalOffset;
        if (patch.align) updated.align = patch.align;
      }
      return updated;
    });
  };

  return (
    <section className="preview-area">
      <div className="preview-head">
        <div>
          <strong>พรีวิว</strong>
          <span>{aspectRatio} • {formatPrecise(currentTime)}</span>
        </div>

        {/* Quick Style Controls in the center toolbar */}
        <div className="preview-quick-styles" style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.03)', padding: '4px 12px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#8d8d8d' }}>ฟอนต์</span>
            <select
              value={currentFont}
              onChange={(e) => updateStyle('typography', { fontFamily: e.target.value })}
              style={{ height: '26px', padding: '0 4px', fontSize: '11px', background: '#111', border: '1px solid rgba(255,255,255,0.1)', cursor: 'pointer' }}
            >
              {fontList.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#8d8d8d' }}>ขนาด</span>
            <input
              type="number"
              min="12"
              max="120"
              value={currentFontSize}
              onChange={(e) => updateStyle('typography', { fontSize: Math.max(12, Math.min(120, Number(e.target.value) || 42)) })}
              style={{ width: '45px', height: '26px', padding: '0 4px', fontSize: '11px', background: '#111', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11px', color: '#8d8d8d' }}>แนวตั้ง</span>
            <input
              type="range"
              min="10"
              max="90"
              value={currentVerticalOffset}
              onChange={(e) => updateStyle('position', { verticalOffset: Number(e.target.value) })}
              style={{ width: '70px', accentColor: '#d89443', cursor: 'pointer', display: 'block', height: '4px' }}
              title={`ระยะห่างจากขอบล่าง: ${currentVerticalOffset}%`}
            />
            <span style={{ fontSize: '10px', color: '#8d8d8d', width: '22px', textAlign: 'right' }}>{currentVerticalOffset}%</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '3px', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '8px' }}>
            <button
              onClick={() => updateStyle('position', { align: 'left' })}
              style={{
                height: '24px',
                padding: '0 8px',
                fontSize: '11px',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '4px',
                background: currentAlign === 'left' ? '#d89443' : 'rgba(255,255,255,0.04)',
                color: currentAlign === 'left' ? '#000' : '#8d8d8d',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ซ้าย
            </button>
            <button
              onClick={() => updateStyle('position', { align: 'center' })}
              style={{
                height: '24px',
                padding: '0 8px',
                fontSize: '11px',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '4px',
                background: currentAlign === 'center' ? '#d89443' : 'rgba(255,255,255,0.04)',
                color: currentAlign === 'center' ? '#000' : '#8d8d8d',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              กลาง
            </button>
            <button
              onClick={() => updateStyle('position', { align: 'right' })}
              style={{
                height: '24px',
                padding: '0 8px',
                fontSize: '11px',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '4px',
                background: currentAlign === 'right' ? '#d89443' : 'rgba(255,255,255,0.04)',
                color: currentAlign === 'right' ? '#000' : '#8d8d8d',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ขวา
            </button>
          </div>
        </div>
        <div className="preview-tools">
          <span>สัดส่วน</span>
          <select value={aspectRatio} onChange={(event) => setAspectRatio(event.target.value)}>
            <option value="9:16">9:16 แนวตั้ง</option>
            <option value="16:9">16:9 แนวนอน</option>
          </select>

          <span>ความเร็ว</span>
          <select value={playbackRate} onChange={(event) => setPlaybackRate(Number(event.target.value))}>
            <option value="1">1x</option>
            <option value="0.75">0.75x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>

          <button className="icon-button soft" onClick={() => handleZoom(-10)}>-</button>
          <span>{zoom}%</span>
          <button className="icon-button soft" onClick={() => handleZoom(10)}>+</button>
          <button className="button ghost" onClick={() => setZoom(100)}>100%</button>
          <button className="button ghost" onClick={handleFullscreen} title="เต็มจอ (Fullscreen)">
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
      <div ref={stageRef} className="stage" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="phone-frame" style={getPhoneFrameStyle()}>
          <video 
            ref={videoRef} 
            src={src} 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onTimeUpdate={(event) => onTime(event.currentTarget.currentTime)} 
            onLoadedMetadata={(event) => onDurationChange?.(event.currentTarget.duration || 0)}
            onDurationChange={(event) => onDurationChange?.(event.currentTarget.duration || 0)}
          />
          <CaptionPreviewText 
            previewWords={previewWords} 
            activeWord={activeWord} 
            style={style} 
            onRequestEdit={startSubtitleEdit}
            isEditing={isEditingSubtitle}
          />
          {isEditingSubtitle && (
            <div
              className="preview-subtitle-editor"
              style={{
                bottom: `${verticalOffset}%`,
                justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
              }}
            >
              <textarea
                ref={subtitleEditRef}
                value={subtitleDraft}
                onChange={(event) => setSubtitleDraft(event.target.value)}
                onBlur={commitSubtitleEdit}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    commitSubtitleEdit();
                  } else if (event.key === 'Escape') {
                    event.preventDefault();
                    cancelSubtitleEdit();
                  }
                }}
                style={{
                  ...fontStyle,
                  ...strokeStyle,
                  ...shadowStyle,
                  ...backgroundStyle,
                  color: style?.fill?.textColor || style?.text_color || '#ffffff',
                  textAlign: align,
                }}
                aria-label="แก้ไขข้อความซับบนพรีวิว"
              />
            </div>
          )}
        </div>
      </div>
      <div className="mini-scrub">
        <button className="button accent" onClick={togglePlay}>
          {isPlaying ? 'หยุด' : 'เล่น'}
        </button>
        <input 
          type="range" 
          min="0" 
          max="100" 
          value={duration ? (currentTime / duration) * 100 : 0} 
          onChange={handleScrub}
        />
        <span>{formatPrecise(currentTime)} / {formatPrecise(duration)}</span>

        <div className="volume-control" style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: '10px' }}>
          <button 
            className="icon-button soft" 
            onClick={() => setIsMuted(!isMuted)} 
            title={isMuted ? "เปิดเสียง" : "ปิดเสียง"}
            style={{ minWidth: '32px', minHeight: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            {isMuted || volume === 0 ? <VolumeX size={15} /> : <Volume2 size={15} />}
          </button>
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.05" 
            value={isMuted ? 0 : volume} 
            onChange={(e) => {
              const v = Number(e.target.value);
              setVolume(v);
              if (v > 0) setIsMuted(false);
            }} 
            style={{ width: '60px', height: '4px', cursor: 'pointer' }}
          />
        </div>
      </div>
    </section>
  );
}
