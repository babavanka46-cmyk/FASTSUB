import React from 'react';
import { getFontStyle, getStrokeStyle, getShadowStyle, getBackgroundStyle, getWordStyle } from '../utils/captionStyle';
import { getAnimationPresetClass, getPreviewAnimationId, normalizeAnimationConfig } from '../presets/animationPresets';

export function CaptionPreviewText({ previewWords, activeWord, style, onRequestEdit, isEditing = false }) {
  if (!previewWords || previewWords.length === 0) return null;
  if (isEditing) return null;
  
  const fontStyle = getFontStyle(style);
  const strokeStyle = getStrokeStyle(style);
  const shadowStyle = getShadowStyle(style);
  const backgroundStyle = getBackgroundStyle(style);
  
  const animation = normalizeAnimationConfig(style.animation);
  const livePreviewId = animation.previewLoop && animation.previewId && animation.previewId !== 'none'
    ? animation.previewId
    : null;
  const animPreset = livePreviewId || getPreviewAnimationId(animation);
  const shouldLoopPreview = Boolean(livePreviewId) || (animation.active && animation.active !== 'none');
  const animClass = getAnimationPresetClass(animPreset, { loop: shouldLoopPreview });
  const animationKey = [
    previewWords.map((word) => word.id).join('-'),
    animPreset,
    animation.previewNonce,
    animation.durationMs,
    animation.intensity,
  ].join('|');
  
  const karaokeMode = style.karaoke?.mode || 'word';
  const verticalOffset = style.position?.verticalOffset ?? style.vertical_offset ?? 25;
  const align = style.position?.align || 'center';

  return (
    <div
      className="subtitle-overlay"
      style={{
        position: 'absolute',
        left: '5%',
        right: '5%',
        bottom: `${verticalOffset}%`,
        display: 'flex',
        justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
        flexWrap: 'wrap',
        pointerEvents: onRequestEdit && !isEditing ? 'auto' : 'none',
        cursor: onRequestEdit && !isEditing ? 'text' : 'default',
        // Critical: overflow visible so stacked Thai tone marks (วรรณยุกต์/สระ) don't clip
        overflow: 'visible',
        overflowWrap: 'anywhere',
        // Generous padding so top diacritics (สระบน) and bottom diacritics (สระล่าง) have space
        paddingTop: '14px',
        paddingBottom: '8px',
      }}
    >
      <div 
        key={animationKey}
        className={`${animClass}${livePreviewId ? ' fastsub-live-animation-preview' : ''}`}
        onClick={(event) => {
          if (!onRequestEdit || isEditing) return;
          event.stopPropagation();
          onRequestEdit();
        }}
        onDoubleClick={(event) => {
          if (!onRequestEdit || isEditing) return;
          event.stopPropagation();
          onRequestEdit();
        }}
        title={onRequestEdit && !isEditing ? 'คลิกเพื่อแก้ไขข้อความซับบนพรีวิว' : undefined}
        style={{
          fontFamily: fontStyle.fontFamily,
          fontSize: fontStyle.fontSize,
          fontWeight: fontStyle.fontWeight,
          lineHeight: fontStyle.lineHeight,
          letterSpacing: fontStyle.letterSpacing,
          ...backgroundStyle,
          display: 'inline-flex',
          flexWrap: 'wrap',
          justifyContent: align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center',
          gap: '0 0.22em',
          // Allow stacked tone marks to show above background box
          overflow: 'visible',
          // Dynamic speed and intensity bindings
          animationDuration: animClass ? `${animation.durationMs}ms` : undefined,
          animationIterationCount: shouldLoopPreview ? 'infinite' : undefined,
          '--animate-duration': `${animation.durationMs}ms`,
          '--anim-intensity': animation.intensity / 100,
        }}
      >
        {previewWords.map((word) => {
          const isActive = karaokeMode === 'word' && activeWord === word.id;
          const wordStyle = getWordStyle(style, isActive);
          
          return (
            <span
              key={word.id}
              style={{
                ...fontStyle,
                ...strokeStyle,
                ...shadowStyle,
                ...wordStyle,
                // Each word span must have overflow:visible so Thai stacked vowels/tone marks
                // that extend above or below the line box are never clipped
                overflow: 'visible',
                display: 'inline-block',
                // Extra vertical padding so diacritics above (เ◌็◌่◌้◌๊◌๋) and below don't clip
                paddingTop: '0.18em',
                paddingBottom: '0.1em',
                // Use lineHeight from style, never clip with hidden overflow
                lineHeight: fontStyle.lineHeight || 1.45,
              }}
            >
              {word.text}
            </span>
          );
        })}
      </div>
    </div>
  );
}
export default CaptionPreviewText;
