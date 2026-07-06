import React from 'react';

const speedOptions = [
  { value: 0.5, label: '0.5x' },
  { value: 0.75, label: '0.75x' },
  { value: 1.0, label: '1x' },
  { value: 1.25, label: '1.25x' },
  { value: 1.5, label: '1.5x' },
  { value: 2.0, label: '2x' }
];

export function AnimationSpeedControl({ style, onChangeSpeed }) {
  const currentSpeed = style.animation?.speed !== undefined 
    ? style.animation.speed 
    : 1.0; // default 1x

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <span style={{ fontSize: '12px', color: '#dfdfdf', fontWeight: 'bold', display: 'block', textAlign: 'left' }}>
        ความเร็วแอนิเมชัน
      </span>
      <div style={{ display: 'flex', gap: '4px', background: '#09090a', padding: '3px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
        {speedOptions.map((opt) => {
          const isSelected = Math.abs(currentSpeed - opt.value) < 0.05;
          return (
            <button
              key={opt.value}
              onClick={() => onChangeSpeed(opt.value)}
              style={{
                flex: 1,
                padding: '6px 0',
                border: 0,
                borderRadius: '6px',
                background: isSelected ? '#d89443' : 'transparent',
                color: isSelected ? '#ffffff' : '#8d8d8d',
                fontSize: '11.5px',
                fontWeight: isSelected ? 'bold' : 'normal',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                outline: 'none',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
export default AnimationSpeedControl;
