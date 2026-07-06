import React from 'react';

export function AnimationIntensityControl({ style, onChangeIntensity }) {
  const intensity = style.animation?.intensity !== undefined 
    ? style.animation.intensity 
    : 50; // default 50

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '12px' }}>
      <span style={{ fontSize: '12px', color: '#dfdfdf', fontWeight: 'bold', display: 'block', textAlign: 'left' }}>
        ความเข้มเอฟเฟกต์
      </span>
      <input 
        type="range"
        min="0"
        max="100"
        value={intensity}
        onChange={(e) => onChangeIntensity(Number(e.target.value))}
        style={{
          width: '100%',
          height: '4px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: '2px',
          cursor: 'pointer',
          accentColor: '#d89443',
          outline: 'none',
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10.5px', color: '#666', marginTop: '-2px' }}>
        <span>น้อย</span>
        <span>มาก ({intensity}%)</span>
      </div>
    </div>
  );
}
export default AnimationIntensityControl;
