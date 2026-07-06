import React, { useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Sparkles, 
  CircleDashed, 
  CircleDot, 
  LogIn, 
  ArrowUp, 
  ZoomIn, 
  FlipHorizontal, 
  Activity, 
  Waves, 
  Star,
  ChevronUp,
  ChevronDown,
  Check,
  Ban
} from 'lucide-react';
import { animationPresetsList } from '../../presets/animationPresets';
import { getStoredBoolean, storageKeys } from '../../utils/editorStorage';

const iconByPreset = {
  none: Ban,
  pop: Sparkles,
  fade: CircleDashed,
  bounce: CircleDot,
  bounceIn: LogIn,
  bounceOut: CircleDot,
  fadeIn: LogIn,
  fadeOut: CircleDashed,
  fadeInUp: ArrowUp,
  zoomIn: ZoomIn,
  zoomOut: ZoomIn,
  slideInUp: ArrowUp,
  slideInLeft: ArrowUp,
  slideOutDown: ArrowUp,
  flip: FlipHorizontal,
  pulse: Activity,
  rubberBand: Waves,
  tada: Star,
};

const modeLabels = {
  in: 'แอนิเมชันเข้า',
  out: 'แอนิเมชันออก',
  loop: 'แอนิเมชันวนซ้ำ',
};

export function AnimationSlotSelector({ activeId, activeMode = 'in', onChange }) {
  const containerRef = useRef(null);
  const wheelLocked = useRef(false);
  const itemHeight = 58;
  const highlightTop = 70;

  const animationPresets = useMemo(
    () => animationPresetsList.filter((item) => item.modes.includes(activeMode)),
    [activeMode]
  );

  const activeIdx = animationPresets.findIndex((item) => item.id === activeId);
  const currentIndex = activeIdx !== -1 ? activeIdx : 0;
  const selectedPreset = animationPresets[currentIndex] || animationPresets[0];
  const visibleSlots = [-2, -1, 0, 1, 2]
    .map((offset) => {
      const index = currentIndex + offset;
      return index >= 0 && index < animationPresets.length
        ? { preset: animationPresets[index], index, offset }
        : null;
    })
    .filter(Boolean);

  const playTick = useCallback(() => {
    if (!getStoredBoolean(storageKeys.animationSlotSoundEnabled, true)) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1000, audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, audioCtx.currentTime + 0.04);
      
      gain.gain.setValueAtTime(0.04, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.04);
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      osc.start();
      osc.stop(audioCtx.currentTime + 0.04);
    } catch (err) {
      // Ignored
    }
  }, []);

  const selectIndex = useCallback((idx) => {
    if (idx < 0 || idx >= animationPresets.length) return;
    const item = animationPresets[idx];
    onChange(item.id);
    playTick();
  }, [animationPresets, onChange, playTick]);

  const handleWheel = (e) => {
    // Only intercept when pointing inside selector
    e.preventDefault();
    if (wheelLocked.current) return;

    if (Math.abs(e.deltaY) < 10) return;

    wheelLocked.current = true;
    setTimeout(() => {
      wheelLocked.current = false;
    }, 200);

    if (e.deltaY > 0) {
      if (currentIndex < animationPresets.length - 1) {
        selectIndex(currentIndex + 1);
      }
    } else {
      if (currentIndex > 0) {
        selectIndex(currentIndex - 1);
      }
    }
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    
    // Add passive: false to allow e.preventDefault()
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWheel);
    };
  }, [currentIndex, selectIndex]);

  return (
    <div 
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        background: 'linear-gradient(180deg, #101113, #080809)',
        border: '1px solid rgba(255,255,255,0.09)',
        borderRadius: '12px',
        padding: '12px',
        position: 'relative',
        userSelect: 'none',
        gap: '8px',
      }}
    >
      <div style={{ width: '100%', display: 'grid', gap: '4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <span style={{ color: '#8f9094', fontSize: '11px', fontWeight: 700 }}>
            {modeLabels[activeMode] || 'แอนิเมชัน'}
          </span>
          <span style={{
            flexShrink: 0,
            color: '#d89443',
            fontSize: '11px',
            fontWeight: 800,
            border: '1px solid rgba(216,148,67,0.26)',
            borderRadius: '999px',
            padding: '2px 8px',
            background: 'rgba(216,148,67,0.08)',
          }}>
            {currentIndex + 1}/{animationPresets.length}
          </span>
        </div>
        <strong style={{
          color: '#f4f4f5',
          fontSize: '14px',
          lineHeight: 1.25,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {selectedPreset?.labelTh || 'ไม่มีเอฟเฟกต์'}
        </strong>
        <span style={{ color: '#8f9094', fontSize: '11px' }}>
          {selectedPreset?.labelEn || 'None'} • หมุนล้อเมาส์หรือกดลูกศรเพื่อเปลี่ยน
        </span>
      </div>

      {/* Up Button */}
      <button
        onClick={() => currentIndex > 0 && selectIndex(currentIndex - 1)}
        disabled={currentIndex === 0}
        style={{
          border: 0,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '8px',
          width: '100%',
          color: currentIndex === 0 ? '#444' : '#8d8d8d',
          cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
          padding: '4px',
          display: 'flex',
          justifyContent: 'center',
          transition: 'color 0.15s',
        }}
        title="เลื่อนขึ้น"
      >
        <ChevronUp size={20} />
      </button>

      {/* Reel Viewport */}
      <div
        ref={containerRef}
        style={{
          height: '198px',
          width: '100%',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          cursor: 'ns-resize',
          borderRadius: '12px',
          background: '#0b0b0c',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(180deg, #0b0b0c 0%, transparent 25%, transparent 75%, #0b0b0c 100%)',
          pointerEvents: 'none',
          zIndex: 3,
        }} />

        {/* Slot highlight overlay bar */}
        <div 
          style={{
            position: 'absolute',
            left: '8px',
            right: '8px',
            top: `${highlightTop}px`,
            height: `${itemHeight}px`,
            border: '2px solid #d89443',
            borderRadius: '10px',
            boxShadow: '0 0 0 1px rgba(216,148,67,0.15), 0 0 18px rgba(216,148,67,0.22)',
            pointerEvents: 'none',
            background: 'linear-gradient(90deg, rgba(216,148,67,0.12), rgba(216,148,67,0.04) 35%, rgba(216,148,67,0.04) 65%, rgba(216,148,67,0.12))',
            zIndex: 2,
          }}
        />

        {/* Visible reel window. Keep the selected item physically inside the highlight bar. */}
        <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none' }}>
          {visibleSlots.map(({ preset, index: idx, offset }) => {
            const isSelected = offset === 0;
            const Icon = iconByPreset[preset.id] || Sparkles;
            const distance = Math.abs(offset);

            return (
              <button
                key={preset.id}
                onClick={() => selectIndex(idx)}
                style={{
                  position: 'absolute',
                  left: '8px',
                  right: '8px',
                  top: `${highlightTop + offset * itemHeight}px`,
                  height: `${itemHeight}px`,
                  border: 0,
                  background: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 14px',
                  cursor: 'pointer',
                  color: isSelected ? '#ffffff' : '#b7b8bc',
                  opacity: isSelected ? 1 : Math.max(0.5, 0.82 - distance * 0.18),
                  transition: 'top 0.24s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s, color 0.2s',
                  width: '100%',
                  textAlign: 'left',
                  outline: 'none',
                  pointerEvents: 'auto',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  width: '100%',
                }}>
                  <span style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '9px',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    background: isSelected ? 'rgba(216,148,67,0.18)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${isSelected ? 'rgba(216,148,67,0.34)' : 'rgba(255,255,255,0.05)'}`,
                  }}>
                      <Icon 
                        size={isSelected ? 20 : 17} 
                        style={{
                        color: isSelected ? '#d89443' : '#a7a8ac',
                        transition: 'color 0.2s, transform 0.2s',
                      }} 
                    />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      fontSize: isSelected ? '14px' : '13px', 
                      fontWeight: isSelected ? 850 : 650,
                      color: isSelected ? '#ffffff' : 'inherit',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {preset.labelTh}
                    </div>
                    <div style={{
                      marginTop: '1px',
                      color: isSelected ? '#f0b36acc' : '#8b8c91',
                      fontSize: '11px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}>
                      {preset.labelEn}
                    </div>
                  </div>
                  {isSelected && (
                    <Check size={16} style={{ color: '#d89443' }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Down Button */}
      <button
        onClick={() => currentIndex < animationPresets.length - 1 && selectIndex(currentIndex + 1)}
        disabled={currentIndex === animationPresets.length - 1}
        style={{
          border: 0,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '8px',
          width: '100%',
          color: currentIndex === animationPresets.length - 1 ? '#444' : '#8d8d8d',
          cursor: currentIndex === animationPresets.length - 1 ? 'not-allowed' : 'pointer',
          padding: '4px',
          display: 'flex',
          justifyContent: 'center',
          transition: 'color 0.15s',
        }}
        title="เลื่อนลง"
      >
        <ChevronDown size={20} />
      </button>
    </div>
  );
}
export default AnimationSlotSelector;
