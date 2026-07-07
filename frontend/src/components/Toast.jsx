import React, { useEffect } from 'react';

export function Toast({ message, type = 'info', onClose, duration = 4000 }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [message, onClose, duration]);

  if (!message) return null;
  
  const colors = {
    info:    { bg: 'rgba(40,40,44,0.95)',  border: 'rgba(255,255,255,0.1)',  fg: '#dfdfdf' },
    success: { bg: 'rgba(16,185,129,0.95)', border: 'rgba(16,185,129,0.4)',  fg: '#fff' },
    warning: { bg: 'rgba(245,158,11,0.95)', border: 'rgba(245,158,11,0.4)',  fg: '#fff' },
    error:   { bg: 'rgba(239,68,68,0.95)',  border: 'rgba(239,68,68,0.4)',   fg: '#fff' },
  };
  
  const c = colors[type] || colors.info;
  
  return (
    <button
      className="toast"
      onClick={onClose}
      type="button"
      style={{ 
        background: c.bg, 
        border: `1px solid ${c.border}`, 
        color: c.fg,
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        padding: '12px 20px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: '500',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
        zIndex: 9999,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'transform 0.2s, opacity 0.2s'
      }}
    >
      {message}
    </button>
  );
}
