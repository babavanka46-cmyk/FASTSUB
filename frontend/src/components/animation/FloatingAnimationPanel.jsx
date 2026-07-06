import React, { useState, useEffect } from 'react';
import { Pin, Search, Sparkles } from 'lucide-react';
import { AnimationSlotSelector } from './AnimationSlotSelector';
import { AnimationSoundToggle } from './AnimationSoundToggle';
import { AnimationSpeedControl } from './AnimationSpeedControl';
import { AnimationIntensityControl } from './AnimationIntensityControl';
import { animationPresetsList, normalizeAnimationConfig } from '../../presets/animationPresets';
import { getStoredBoolean, getStoredJson, setStoredJson, storageKeys } from '../../utils/editorStorage';

function PresetCard({ preset, activeId, onSelect, onToggleFav, isFav }) {
  const [hovered, setHovered] = useState(false);
  const isSelected = activeId === preset.id;

  return (
    <div
      onClick={() => onSelect(preset.id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: isSelected ? 'rgba(216, 148, 67, 0.08)' : '#161618',
        border: `1px solid ${isSelected ? '#d89443' : 'rgba(255,255,255,0.06)'}`,
        borderRadius: '10px',
        padding: '8px 10px',
        cursor: 'pointer',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        minHeight: '78px',
        transition: 'border-color 0.2s, transform 0.15s, background 0.2s',
        transform: hovered ? 'translateY(-2px)' : 'none',
        boxShadow: hovered ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
      }}
    >
      {/* Visual Preview Box */}
      <div
        style={{
          width: '100%',
          height: '38px',
          background: '#0d0d0f',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <span
          className={hovered && preset.id !== 'none' ? preset.cssClass : ''}
          style={{
            fontSize: '12px',
            fontWeight: 'bold',
            color: isSelected ? '#ffd8a1' : '#ffffff',
            display: 'inline-block',
            animationDuration: '0.6s',
            animationIterationCount: 'infinite',
          }}
        >
          Aa
        </span>
      </div>

      {/* Title */}
      <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', minWidth: 0, gap: '4px' }}>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 'bold',
            color: isSelected ? '#d89443' : '#a0a0a0',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}
          title={preset.labelTh}
        >
          {preset.labelTh}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFav(preset.id);
          }}
          style={{
            background: 'transparent',
            border: 0,
            color: isFav ? '#d89443' : '#3c3c3e',
            cursor: 'pointer',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
            fontSize: '12px',
          }}
        >
          ★
        </button>
      </div>
    </div>
  );
}

import { useEditor } from '../../context/EditorContext';

export function FloatingAnimationPanel() {
  const { style, onStyle, activeTool, isInspectorCollapsed } = useEditor();
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'slot'
  const [activeMode, setActiveMode] = useState('in'); // 'in', 'out', 'loop'
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('ทั้งหมด');

  const [favorites, setFavorites] = useState(() => getStoredJson(storageKeys.animationFavorites, []));

  const [recents, setRecents] = useState(() => getStoredJson(storageKeys.animationRecents, []));

  if (!style || activeTool !== 'styles' || isInspectorCollapsed) return null;

  // Sound Synth Click
  const playTick = () => {
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
  };

  // Get active key based on mode
  const getActiveId = () => {
    const animation = normalizeAnimationConfig(style.animation);
    if (activeMode === 'in') return animation.enter;
    if (activeMode === 'out') return animation.exit;
    if (activeMode === 'loop') return animation.active;
    return 'none';
  };

  const currentAnim = getActiveId();

  const updateAnimStyle = (patch) => {
    onStyle((current) => {
      const updated = { ...current };
      updated.animation = { ...normalizeAnimationConfig(updated.animation), ...patch };
      return updated;
    });
  };

  const handleAnimationChange = (id) => {
    playTick();
    const previewPatch = {
      previewId: id,
      previewMode: activeMode,
      previewNonce: Date.now(),
      previewLoop: id !== 'none',
    };
    if (activeMode === 'in') updateAnimStyle({ enter: id, ...previewPatch });
    else if (activeMode === 'out') updateAnimStyle({ exit: id, ...previewPatch });
    else if (activeMode === 'loop') updateAnimStyle({ active: id, ...previewPatch });

    // Track recently used
    setRecents((prev) => {
      const next = [id, ...prev.filter((item) => item !== id)].slice(0, 8);
      setStoredJson(storageKeys.animationRecents, next);
      return next;
    });
  };

  const handleSpeedChange = (speedVal) => {
    const baseDuration = 360;
    const newDurationMs = Math.round(baseDuration / speedVal);
    updateAnimStyle({ speed: speedVal, durationMs: newDurationMs });
  };

  const handleIntensityChange = (intensityVal) => {
    updateAnimStyle({ intensity: intensityVal });
  };

  const handleToggleFav = (id) => {
    playTick();
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      setStoredJson(storageKeys.animationFavorites, next);
      return next;
    });
  };

  // Category and Tag Filtering
  const categories = ['ทั้งหมด', 'รายการโปรด', 'Trending', 'Motion & Path', 'Mask & Reveal', 'Fluent', 'Build', 'Stylized'];
  
  const filteredPresets = animationPresetsList.filter((item) => {
    // Filter by mode compatibility first
    if (!item.modes.includes(activeMode)) return false;

    // Filter by category
    if (activeCategory === 'รายการโปรด') {
      if (!favorites.includes(item.id)) return false;
    } else if (activeCategory !== 'ทั้งหมด') {
      if (item.category !== activeCategory) return false;
    }
    
    // Filter by search query
    if (searchTerm.trim() !== '') {
      const q = searchTerm.toLowerCase();
      const matchName = item.labelTh.toLowerCase().includes(q) || 
                        item.labelEn.toLowerCase().includes(q) || 
                        item.id.toLowerCase().includes(q);
      const matchTags = item.tags.some(t => t.toLowerCase().includes(q));
      if (!matchName && !matchTags) return false;
    }
    return true;
  });

  return (
    <div 
      className="animation-floating-column"
      style={{
        width: '360px',
        maxWidth: '100%',
        background: '#111214',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '16px',
        padding: '16px',
        boxShadow: '0 18px 50px rgba(0,0,0,0.55)',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        alignSelf: 'start',
        position: 'sticky',
        top: '12px',
        zIndex: 10,
        height: 'fit-content',
      }}
    >
      {/* Header */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          paddingBottom: '10px',
          marginBottom: '2px',
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: '800', color: '#ffffff' }}>แอนิเมชันข้อความ</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => { playTick(); setViewMode('grid'); }}
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              border: 0,
              background: viewMode === 'grid' ? '#d89443' : 'rgba(255,255,255,0.04)',
              color: viewMode === 'grid' ? '#000' : '#8d8d8d',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            ตาราง
          </button>
          <button
            onClick={() => { playTick(); setViewMode('slot'); }}
            style={{
              fontSize: '11px',
              padding: '2px 8px',
              borderRadius: '4px',
              border: 0,
              background: viewMode === 'slot' ? '#d89443' : 'rgba(255,255,255,0.04)',
              color: viewMode === 'slot' ? '#000' : '#8d8d8d',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            วงล้อ
          </button>
        </div>
      </div>

      {viewMode === 'grid' ? (
        <>
          {/* In / Out / Loop Tabs */}
          <div style={{ display: 'flex', background: '#09090a', borderRadius: '8px', padding: '2px' }}>
            {[
              { id: 'in', label: 'เข้า' },
              { id: 'out', label: 'ออก' },
              { id: 'loop', label: 'วนซ้ำ' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => { playTick(); setActiveMode(tab.id); }}
                style={{
                  flex: 1,
                  padding: '6px 0',
                  border: 0,
                  borderRadius: '6px',
                  background: activeMode === tab.id ? 'rgba(216,148,67,0.12)' : 'transparent',
                  color: activeMode === tab.id ? '#d89443' : '#8d8d8d',
                  fontSize: '12px',
                  fontWeight: activeMode === tab.id ? 'bold' : 'normal',
                  cursor: 'pointer',
                  transition: 'color 0.15s',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(0,0,0,0.2)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '8px',
              padding: '0 8px',
              height: '32px',
            }}
          >
            <Search size={14} style={{ color: '#8d8d8d', marginRight: '6px' }} />
            <input
              type="text"
              placeholder="ค้นหาแอนิเมชัน..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                background: 'transparent',
                border: 0,
                color: '#fff',
                fontSize: '12px',
                outline: 'none',
                width: '100%',
              }}
            />
          </div>

          {/* Categories horizontal scroll */}
          <div
            style={{
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
              paddingBottom: '4px',
              whiteSpace: 'nowrap',
            }}
          >
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { playTick(); setActiveCategory(cat); }}
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  borderRadius: '12px',
                  border: `1px solid ${activeCategory === cat ? '#d89443' : 'rgba(255,255,255,0.06)'}`,
                  background: activeCategory === cat ? 'rgba(216,148,67,0.1)' : 'transparent',
                  color: activeCategory === cat ? '#d89443' : '#8d8d8d',
                  cursor: 'pointer',
                  fontWeight: activeCategory === cat ? 'bold' : 'normal',
                  flexShrink: 0,
                  transition: 'all 0.15s',
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Grid Layout */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: '8px',
              maxHeight: '190px',
              overflowY: 'auto',
              paddingRight: '2px',
            }}
          >
            {filteredPresets.map((preset) => (
              <PresetCard
                key={preset.id}
                preset={preset}
                activeId={currentAnim}
                onSelect={handleAnimationChange}
                onToggleFav={handleToggleFav}
                isFav={favorites.includes(preset.id)}
              />
            ))}
            {filteredPresets.length === 0 && (
              <div style={{ gridColumn: 'span 2', textAlign: 'center', padding: '24px 0', color: '#6d6d6d', fontSize: '11px' }}>
                ไม่พบแอนิเมชันที่ค้นหาในหมวดหมู่นี้
              </div>
            )}
          </div>
        </>
      ) : (
        /* Reel Slot Selector */
        <AnimationSlotSelector 
          activeId={currentAnim} 
          activeMode={activeMode}
          onChange={handleAnimationChange} 
        />
      )}

      {/* Sound Toggle */}
      <AnimationSoundToggle />

      {/* Speed Control */}
      <AnimationSpeedControl 
        style={style} 
        onChangeSpeed={handleSpeedChange} 
      />

      {/* Intensity Control */}
      <AnimationIntensityControl 
        style={style} 
        onChangeIntensity={handleIntensityChange} 
      />
    </div>
  );
}

export default FloatingAnimationPanel;
