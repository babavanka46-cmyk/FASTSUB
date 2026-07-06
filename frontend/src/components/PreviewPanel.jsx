import React, { useState, useEffect } from 'react';
import { formatPrecise } from '../subtitleUtils';
import { API } from '../api';

export function PreviewPanel({ project, previewWords, activeWord, style, videoRef, onTime, currentTime, duration }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [playbackRate, setPlaybackRate] = useState(1);

  const src = `${API}/media/${project.source_video.replaceAll('\\', '/')}`;

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
  }, [playbackRate, currentTime]);

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

  return (
    <section className="preview-area">
      <div className="preview-head">
        <div>
          <strong>พรีวิว</strong>
          <span>{aspectRatio} • {formatPrecise(currentTime)}</span>
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
          <button className="button ghost" disabled title="เต็มจอ (ยังไม่เปิดใช้งาน)">เต็มจอ</button>
        </div>
      </div>
      <div className="stage" style={{ overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="phone-frame" style={getPhoneFrameStyle()}>
          <video 
            ref={videoRef} 
            src={src} 
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onTimeUpdate={(event) => onTime(event.currentTarget.currentTime)} 
          />
          <div
            className={`subtitle-overlay preset-${style.preset} anim-${style.animation}`}
            style={{
              bottom: `${style.vertical_offset}%`,
              color: style.text_color,
              fontFamily: style.font_family,
              fontSize: `clamp(18px, 5.5vh, ${style.font_size}px)`,
              fontWeight: style.font_weight,
              textShadow: `0 3px 0 #111, 0 7px 14px ${style.shadow_color}`,
            }}
          >
            {(previewWords || []).map((word) => (
              <span key={word.id} style={{ color: activeWord === word.id ? style.active_color : style.text_color }}>{word.text}</span>
            ))}
          </div>
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
      </div>
    </section>
  );
}
