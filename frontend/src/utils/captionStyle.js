export function getFontStyle(style) {
  const typography = style?.typography || {};
  const fontFamily = typography.fontFamily || style?.font_family || 'Noto Sans Thai';
  const fontSize = typography.fontSize || style?.font_size || 42;
  const fontWeight = typography.fontWeight || style?.font_weight || 700;
  const lineHeight = typography.lineHeight || style?.line_height || 1.35;
  const letterSpacing = typography.letterSpacing ?? style?.letter_spacing ?? 0;

  return {
    fontFamily: `"${fontFamily}", "Noto Sans Thai", "Prompt", "Kanit", "Sarabun", sans-serif`,
    fontSize: `${fontSize}px`,
    fontWeight,
    lineHeight,
    letterSpacing: `${letterSpacing}px`,
  };
}

export function getStrokeStyle(style) {
  if (!style || !style.stroke || !style.stroke.enabled) {
    return { WebkitTextStroke: '0px transparent', textStroke: '0px transparent' };
  }
  const width = style.stroke.width !== undefined ? style.stroke.width : 1;
  const color = style.stroke.color || '#000000';
  return {
    WebkitTextStroke: `${width}px ${color}`,
    textStroke: `${width}px ${color}`,
  };
}

export function getShadowStyle(style) {
  if (!style || !style.shadow || !style.shadow.enabled) return { textShadow: 'none' };
  const { color, blur, offsetX, offsetY } = style.shadow;
  
  // Just use a proper blurred drop shadow. No blocky diagonal offsets.
  return {
    textShadow: `${offsetX || 0}px ${offsetY || 0}px ${blur || 0}px ${color || 'rgba(0,0,0,0.5)'}`,
  };
}

export function getBackgroundStyle(style) {
  if (!style || !style.background || !style.background.enabled) return { backgroundColor: 'transparent' };
  const { color, opacity, radius, paddingX, paddingY } = style.background;
  
  // Convert hex color to rgba to apply opacity
  let backgroundRgba = color || '#000000';
  if (backgroundRgba.startsWith('#')) {
    const r = parseInt(backgroundRgba.slice(1, 3), 16);
    const g = parseInt(backgroundRgba.slice(3, 5), 16);
    const b = parseInt(backgroundRgba.slice(5, 7), 16);
    backgroundRgba = `rgba(${r}, ${g}, ${b}, ${opacity || 0.72})`;
  }
  
  return {
    backgroundColor: backgroundRgba,
    borderRadius: radius ? `${radius}px` : '6px',
    padding: `${paddingY || 0}px ${paddingX || 0}px`,
  };
}

export function getWordStyle(style, isActive) {
  if (!style) return {};
  
  const fillSettings = style.fill || {};
  const karaokeSettings = style.karaoke || {};
  
  const textColor = fillSettings.textColor || '#ffffff';
  const activeColor = fillSettings.activeColor || '#ffffff';
  const inactiveOpacity = fillSettings.inactiveOpacity || 0.9;
  
  const activeScale = karaokeSettings.activeScale || 1.0;
  const dimInactive = karaokeSettings.dimInactive || false;
  
  const styleObj = {
    display: 'inline-block',
    transition: 'transform 0.15s cubic-bezier(0.175, 0.885, 0.32, 1.275), color 0.12s ease',
  };
  
  if (isActive) {
    styleObj.color = activeColor;
    if (activeScale > 1.0) {
      styleObj.transform = `scale(${activeScale})`;
    }
  } else {
    styleObj.color = textColor;
    if (dimInactive) {
      styleObj.opacity = inactiveOpacity;
    }
  }
  
  return styleObj;
}
