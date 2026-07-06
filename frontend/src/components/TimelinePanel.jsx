import React, { useState } from 'react';
import { Pause, Play, Scissors } from 'lucide-react';
import { formatPrecise } from '../subtitleUtils';
import { useEditor } from '../context/EditorContext';

export function TimelinePanel() {
  const {
    allWords,
    currentTime,
    duration,
    activeSegment,
    segmentCount,
    activeWord,
    videoRef,
    onTime,
    onSplitSegment,
  } = useEditor();

  const [zoom, setZoom] = useState(150); // pixels per second (zoom scale factor)

  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const visibleWords = (allWords || []).filter((word) => String(word.text || '').trim());
  
  // Calculate zoom track width (in pixels)
  const trackWidth = safeDuration * zoom;
  const playheadLeft = currentTime * zoom;

  const activeSegmentIndex = activeSegment?.id
    ? String(activeSegment.id).replace(/^seg-/, '')
    : '-';
  const activeSegmentWords = activeSegment?.words || [];
  const splitWord = activeSegmentWords.find((word) => word.id === activeWord)
    || activeSegmentWords.find((word) => currentTime >= word.start && currentTime <= word.end)
    || activeSegmentWords.find((word) => currentTime < word.end)
    || activeSegmentWords[activeSegmentWords.length - 1];
  const splitWordIndex = splitWord ? activeSegmentWords.findIndex((word) => word.id === splitWord.id) : -1;
  const canSplit = Boolean(onSplitSegment && activeSegment?.id && splitWord && splitWordIndex >= 0 && splitWordIndex < activeSegmentWords.length - 1);

  // Dynamic Tick Marks Calculation based on Zoom density
  let tickInterval = 5; // default every 5 seconds
  if (zoom > 80) tickInterval = 1;      // dense zoom: every 1 second
  else if (zoom > 40) tickInterval = 2; // medium-dense zoom: every 2 seconds
  else if (zoom < 15) tickInterval = 10; // wide view zoom: every 10 seconds

  const tickCount = Math.floor(safeDuration / tickInterval);
  const ticks = Array.from({ length: tickCount + 1 }).map((_, index) => {
    const time = index * tickInterval;
    return {
      time,
      label: formatPrecise(time),
      left: time * zoom,
    };
  });

  return (
    <section className="timeline-panel">
      <div className="timeline-top">
        <strong>{formatPrecise(currentTime)}</strong>
        <span>/ {formatPrecise(duration)}</span>
        <div className="timeline-controls">
          <button className="icon-button soft" onClick={() => videoRef.current?.pause()} title="หยุดวิดีโอ"><Pause size={15} /></button>
          <button className="icon-button soft" onClick={() => videoRef.current?.play()} title="เล่นวิดีโอ"><Play size={15} /></button>
          <button
            className="icon-button soft"
            disabled={!canSplit}
            onClick={() => onSplitSegment?.(activeSegment.id, splitWord.id)}
            title={canSplit ? 'แยกซับหลังคำปัจจุบัน' : 'เลือกคำที่ยังมีคำถัดไปเพื่อแยกซับ'}
          >
            <Scissors size={15} />
          </button>
          <span>ซูมไทม์ไลน์</span>
          <input 
            type="range" 
            min="30" 
            max="300" 
            value={zoom} 
            onChange={(e) => setZoom(Number(e.target.value))} 
            title="ซูมไทม์ไลน์" 
          />
          <span>{zoom}px/s</span>
        </div>
      </div>
      
      {/* Scrollable timeline track container */}
      <div 
        className="timeline-track-container" 
        style={{ 
          overflowX: 'auto', 
          width: '100%', 
          position: 'relative', 
          background: '#0d0d0f',
          borderTop: '1px solid rgba(255,255,255,0.06)'
        }}
      >
        <div 
          className="timeline-track" 
          style={{ 
            width: `${Math.max(500, trackWidth)}px`, 
            position: 'relative', 
            height: '80px',
            cursor: 'pointer' 
          }}
          onClick={(event) => {
            if (!videoRef.current || !safeDuration) return;
            const rect = event.currentTarget.getBoundingClientRect();
            const clickOffset = event.clientX - rect.left;
            const ratio = clickOffset / rect.width;
            const next = Math.min(safeDuration, Math.max(0, (clickOffset / zoom)));
            videoRef.current.currentTime = next;
            onTime(next);
          }}
        >
          {/* Dynamic background ticks */}
          <div className="timeline-beat-row" style={{ position: 'relative', height: '24px', width: '100%', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {ticks.map((tick) => (
              <span 
                key={tick.time} 
                style={{ 
                  position: 'absolute', 
                  left: `${tick.left}px`, 
                  fontSize: '9px', 
                  color: 'rgba(255,255,255,0.3)',
                  borderLeft: '1px solid rgba(255,255,255,0.15)',
                  height: '100%',
                  paddingLeft: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  pointerEvents: 'none'
                }}
              >
                {tick.label}
              </span>
            ))}
          </div>

          {/* Subtitle Words track */}
          <div className="timeline-caption-row" style={{ position: 'relative', height: '36px', width: '100%' }}>
            {visibleWords.map((word) => (
              <span
                key={word.id}
                className="caption-chip"
                style={{
                  position: 'absolute',
                  left: `${word.start * zoom}px`,
                  width: `${Math.max(15, (word.end - word.start) * zoom)}px`,
                  height: '24px',
                  lineHeight: '22px',
                  top: '6px'
                }}
              >
                {word.text}
              </span>
            ))}
          </div>

          {/* Segment display label */}
          <div 
            className="main-segment" 
            style={{ 
              position: 'absolute', 
              bottom: '4px', 
              left: '12px', 
              fontSize: '10px', 
              color: '#8d8d8d',
              pointerEvents: 'none'
            }}
          >
            เซกเมนต์ {activeSegmentIndex} / {segmentCount || 0} • {formatPrecise(safeDuration)}
          </div>

          {/* Dynamic playhead indicator */}
          <div 
            className="timeline-playhead" 
            style={{ 
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: `${playheadLeft}px`,
              width: '1px',
              background: '#d89443',
              zIndex: 100,
              pointerEvents: 'none'
            }}
          >
            <span 
              style={{
                position: 'absolute',
                top: 0,
                transform: 'translateX(-50%)',
                background: '#d89443',
                color: '#000000',
                fontSize: '8px',
                padding: '1px 3px',
                borderRadius: '3px',
                fontWeight: 'bold',
                whiteSpace: 'nowrap'
              }}
            >
              {formatPrecise(currentTime)}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default TimelinePanel;
