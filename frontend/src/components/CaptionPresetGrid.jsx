import React from 'react';
import { captionPresets } from '../presets/captionPresets';
import { getFontStyle, getStrokeStyle, getShadowStyle, getBackgroundStyle } from '../utils/captionStyle';

export function CaptionPresetGrid({ selectedId, onSelectPreset }) {
  return (
    <div className="preset-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '10px', marginTop: '8px' }}>
      {captionPresets.map((preset) => {
        const fontStyle = getFontStyle(preset);
        const strokeStyle = getStrokeStyle(preset);
        const shadowStyle = getShadowStyle(preset);
        const backgroundStyle = getBackgroundStyle(preset);
        const isSelected = selectedId === preset.id;

        // Generate a gradient backdrop for the preview box to simulate video
        const cardBg = isSelected
          ? 'linear-gradient(135deg, #1a120a 0%, #0d1a0d 100%)'
          : 'linear-gradient(135deg, #0d0d0d 0%, #111116 100%)';

        return (
          <button
            key={preset.id}
            className={`preset-card ${isSelected ? 'active' : ''}`}
            onClick={() => onSelectPreset(preset)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'stretch',
              border: isSelected ? '2px solid #d89443' : '1px solid rgba(255,255,255,0.07)',
              borderRadius: '10px',
              background: isSelected ? 'rgba(216,148,67,0.06)' : 'rgba(22,22,24,0.6)',
              padding: '0',
              cursor: 'pointer',
              textAlign: 'left',
              outline: 'none',
              transition: 'all 0.18s ease',
              boxShadow: isSelected ? '0 0 0 1px rgba(216,148,67,0.25), 0 4px 12px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            {/* Styled Mini Text Preview Box */}
            <div
              style={{
                height: '64px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '8px 8px 0 0',
                background: cardBg,
                overflow: 'visible',
                padding: '6px 4px',
                position: 'relative',
              }}
            >
              {/* Simulated film grain overlay */}
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '8px 8px 0 0',
                background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.04) 2px, rgba(0,0,0,0.04) 4px)',
                pointerEvents: 'none',
              }} />
              <div
                style={{
                  ...fontStyle,
                  ...strokeStyle,
                  ...shadowStyle,
                  ...backgroundStyle,
                  fontSize: '16px',
                  whiteSpace: 'nowrap',
                  overflow: 'visible',
                  paddingTop: '0.15em',
                  paddingBottom: '0.05em',
                  color: preset.fill?.textColor || '#fff',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                ซับไทย FASTSUB
              </div>
            </div>

            <div style={{ padding: '7px 8px 8px' }}>
              <strong style={{ fontSize: '11.5px', display: 'block', color: isSelected ? '#d89443' : '#dfdfdf' }}>
                {preset.name}
              </strong>
              <span style={{
                fontSize: '10px', color: '#8d8d8d', marginTop: '2px',
                lineHeight: '1.25', display: '-webkit-box',
                WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {preset.description}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
