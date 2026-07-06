import React, { useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { getStoredBoolean, setStoredBoolean, storageKeys } from '../../utils/editorStorage';

export function AnimationSoundToggle() {
  const [enabled, setEnabled] = useState(() => getStoredBoolean(storageKeys.animationSlotSoundEnabled, true));

  const toggle = () => {
    const nextVal = !enabled;
    setEnabled(nextVal);
    setStoredBoolean(storageKeys.animationSlotSoundEnabled, nextVal);
  };

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 14px',
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.05)',
        borderRadius: '8px',
        marginTop: '12px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {enabled ? (
          <Volume2 size={16} style={{ color: '#d89443' }} />
        ) : (
          <VolumeX size={16} style={{ color: '#666' }} />
        )}
        <div style={{ textAlign: 'left' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#dfdfdf' }}>เสียงเลื่อนเมนู (Slot Sound)</div>
          <div style={{ fontSize: '10px', color: '#8d8d8d' }}>เล่นเสียงคลิกเมื่อสลับเลือกแอนิเมชัน</div>
        </div>
      </div>
      
      {/* IOS-style toggle switch */}
      <button 
        onClick={toggle}
        style={{
          width: '46px',
          height: '24px',
          borderRadius: '12px',
          background: enabled ? '#d89443' : '#333',
          border: '1px solid rgba(255,255,255,0.06)',
          position: 'relative',
          cursor: 'pointer',
          padding: 0,
          transition: 'background 0.2s',
          outline: 'none',
        }}
      >
        <div 
          style={{
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            background: '#ffffff',
            position: 'absolute',
            top: '1px',
            left: enabled ? '23px' : '1px',
            transition: 'left 0.2s',
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }}
        />
      </button>
    </div>
  );
}
export default AnimationSoundToggle;
