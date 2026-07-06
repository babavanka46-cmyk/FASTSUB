import React from 'react';
import { Pause, Play, Scissors } from 'lucide-react';
import { formatPrecise } from '../subtitleUtils';

export function TimelinePanel({ allWords, currentTime, duration, videoRef, onTime }) {
  const playhead = `${Math.min(100, (currentTime / duration) * 100)}%`;

  return (
    <section className="timeline-panel">
      <div className="timeline-top">
        <strong>{formatPrecise(currentTime)}</strong>
        <span>/ {formatPrecise(duration)}</span>
        <div className="timeline-controls">
          <button className="icon-button soft" onClick={() => videoRef.current?.pause()} title="หยุดวิดีโอ"><Pause size={15} /></button>
          <button className="icon-button soft" onClick={() => videoRef.current?.play()} title="เล่นวิดีโอ"><Play size={15} /></button>
          <button className="icon-button soft" disabled title="แยกข้อความ/ตัดคำ (ยังไม่เปิดใช้งาน)"><Scissors size={15} /></button>
          <button className="button ghost" disabled title="เชื่อมข้อความ (ยังไม่เปิดใช้งาน)">เชื่อม</button>
          <button className="button ghost" disabled title="เพิ่มข้อความตรงนี้ (ยังไม่เปิดใช้งาน)">เพิ่มตรงนี้</button>
          <span>ซูม timeline</span>
          <input type="range" min="0" max="100" defaultValue="18" disabled title="ซูมไทม์ไลน์ (ยังไม่เปิดใช้งาน)" />
          <span>100%</span>
        </div>
      </div>
      <div className="timeline-track" onClick={(event) => {
        if (!videoRef.current || !Number.isFinite(duration) || duration <= 0) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const ratio = (event.clientX - rect.left) / rect.width;
        const next = Math.min(duration, Math.max(0, ratio * duration));
        videoRef.current.currentTime = next;
        onTime(next);
      }}>
        <div className="beat-row">
          {Array.from({ length: 92 }).map((_, index) => <span key={index} />)}
        </div>
        <div className="caption-row">
          {allWords.map((word) => (
            <span
              key={word.id}
              className="caption-chip"
              style={{
                left: `${(word.start / duration) * 100}%`,
                width: `${Math.max(1.4, ((word.end - word.start) / duration) * 100)}%`,
              }}
            >
              {word.text}
            </span>
          ))}
        </div>
        <div className="main-segment">Segment 1 • {duration.toFixed(1)}s</div>
        <div className="playhead" style={{ left: playhead }}><span>{formatPrecise(currentTime)}</span></div>
      </div>
    </section>
  );
}
