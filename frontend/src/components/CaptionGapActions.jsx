import React, { useState } from 'react';

export function CaptionGapActions({ onAdd, onMerge, label = '', alwaysVisible = false }) {
  const [focused, setFocused] = useState(false);

  return (
    <div
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setFocused(false);
        }
      }}
      className="sub-gap-actions-container"
    >
      {/* Divider line */}
      <div className="sub-gap-divider" />
      {/* Contextual actions */}
      <div className={`sub-gap-button-group ${alwaysVisible || focused ? 'visible' : ''}`}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd?.();
          }}
          disabled={!onAdd}
          className="sub-gap-btn-add"
          title={label ? `เพิ่มหลังจาก ${label}` : 'เพิ่มคำบรรยาย'}
        >
          + เพิ่ม
        </button>
        {onMerge && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMerge();
            }}
            className="sub-gap-btn-merge"
            title="รวมช่วงคำบรรยาย 2 รายการเข้าด้วยกัน"
          >
            รวม
          </button>
        )}
      </div>
    </div>
  );
}

export default CaptionGapActions;
