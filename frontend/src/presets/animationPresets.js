export const animationPresetsList = [
  { id: 'none', labelTh: 'ไม่มีเอฟเฟกต์', labelEn: 'None', category: 'Build', tags: ['none', 'ปิด', 'ไม่มี'], modes: ['in', 'out', 'loop'], cssClass: '' },
  { id: 'pop', labelTh: 'ขยายตัวพรีเมียม', labelEn: 'Pop', category: 'Fluent', tags: ['ซูม', 'ป๊อป', 'pop', 'zoom', 'fluent'], modes: ['in'], cssClass: 'legacy-anim-pop' },
  { id: 'fade', labelTh: 'เลือนธรรมชาติ', labelEn: 'Fade', category: 'Mask & Reveal', tags: ['เลือน', 'fade', 'reveal'], modes: ['in', 'out'], cssClass: 'legacy-anim-fade' },
  { id: 'bounce', labelTh: 'กระดอนดิ้นได้', labelEn: 'Bounce', category: 'Motion & Path', tags: ['กระเด้ง', 'bounce', 'motion'], modes: ['in', 'loop'], cssClass: 'animate__animated animate__bounce' },
  { id: 'bounceIn', labelTh: 'กระดอนเข้าฉาก', labelEn: 'Bounce In', category: 'Motion & Path', tags: ['เข้า', 'กระดอน', 'bounce', 'in'], modes: ['in'], cssClass: 'animate__animated animate__bounceIn' },
  { id: 'bounceOut', labelTh: 'กระดอนออกฉาก', labelEn: 'Bounce Out', category: 'Motion & Path', tags: ['ออก', 'กระดอน', 'bounce', 'out'], modes: ['out'], cssClass: 'animate__animated animate__bounceOut' },
  { id: 'fadeIn', labelTh: 'เลือนปรากฏ', labelEn: 'Fade In', category: 'Mask & Reveal', tags: ['เลือน', 'ปรากฏ', 'fade', 'in'], modes: ['in'], cssClass: 'animate__animated animate__fadeIn' },
  { id: 'fadeOut', labelTh: 'เลือนหาย', labelEn: 'Fade Out', category: 'Mask & Reveal', tags: ['เลือน', 'หาย', 'fade', 'out'], modes: ['out'], cssClass: 'animate__animated animate__fadeOut' },
  { id: 'fadeInUp', labelTh: 'เลือนขึ้นด้านบน', labelEn: 'Fade In Up', category: 'Mask & Reveal', tags: ['ขึ้น', 'เลื่อน', 'fade', 'up'], modes: ['in'], cssClass: 'animate__animated animate__fadeInUp' },
  { id: 'zoomIn', labelTh: 'ซูมขยายเข้า', labelEn: 'Zoom In', category: 'Fluent', tags: ['ซูม', 'ขยาย', 'zoom', 'in'], modes: ['in'], cssClass: 'animate__animated animate__zoomIn' },
  { id: 'zoomOut', labelTh: 'ซูมออก', labelEn: 'Zoom Out', category: 'Fluent', tags: ['ซูม', 'ออก', 'zoom', 'out'], modes: ['out'], cssClass: 'animate__animated animate__zoomOut' },
  { id: 'slideInUp', labelTh: 'เลื่อนเข้าจากล่าง', labelEn: 'Slide In Up', category: 'Motion & Path', tags: ['เลื่อน', 'slide', 'up'], modes: ['in'], cssClass: 'animate__animated animate__slideInUp' },
  { id: 'slideInLeft', labelTh: 'เลื่อนเข้าซ้าย', labelEn: 'Slide In Left', category: 'Motion & Path', tags: ['เลื่อน', 'slide', 'left'], modes: ['in'], cssClass: 'animate__animated animate__slideInLeft' },
  { id: 'slideOutDown', labelTh: 'เลื่อนลงออก', labelEn: 'Slide Out Down', category: 'Motion & Path', tags: ['เลื่อน', 'slide', 'down', 'out'], modes: ['out'], cssClass: 'animate__animated animate__slideOutDown' },
  { id: 'flip', labelTh: 'พลิกหมุนตัวอักษร', labelEn: 'Flip', category: 'Build', tags: ['หมุน', 'พลิก', 'flip'], modes: ['in', 'loop'], cssClass: 'animate__animated animate__flip' },
  { id: 'pulse', labelTh: 'เต้นเป็นจังหวะ', labelEn: 'Pulse', category: 'Stylized', tags: ['ชีพจร', 'เต้น', 'pulse', 'loop'], modes: ['loop'], cssClass: 'animate__animated animate__pulse' },
  { id: 'rubberBand', labelTh: 'ยางยืดหยุ่น', labelEn: 'Rubber Band', category: 'Stylized', tags: ['ยืด', 'ยาง', 'rubber', 'band', 'loop'], modes: ['loop'], cssClass: 'animate__animated animate__rubberBand' },
  { id: 'tada', labelTh: 'แต๊นแตนเอฟเฟกต์', labelEn: 'Tada', category: 'Stylized', tags: ['ตื่นเต้น', 'tada', 'loop'], modes: ['loop'], cssClass: 'animate__animated animate__tada' },
];

export function normalizeAnimationConfig(animation) {
  if (!animation || typeof animation === 'string') {
    return {
      enter: typeof animation === 'string' ? animation : 'pop',
      exit: 'fadeOut',
      active: 'none',
      durationMs: 360,
      speed: 1,
      intensity: 50,
      previewId: null,
      previewMode: 'in',
      previewNonce: 0,
      previewLoop: false,
    };
  }
  return {
    enter: animation.enter || 'pop',
    exit: animation.exit || 'fadeOut',
    active: animation.active || 'none',
    durationMs: animation.durationMs || 360,
    speed: animation.speed || 1,
    intensity: animation.intensity ?? 50,
    direction: animation.direction || 'up',
    easing: animation.easing || 'ease-out',
    previewId: animation.previewId || null,
    previewMode: animation.previewMode || 'in',
    previewNonce: animation.previewNonce || 0,
    previewLoop: Boolean(animation.previewLoop),
  };
}

export function getAnimationPreset(id) {
  return animationPresetsList.find((preset) => preset.id === id) || animationPresetsList[0];
}

export function getAnimationPresetClass(id, { loop = false } = {}) {
  if (!id || id === 'none') return '';
  const preset = getAnimationPreset(id);
  const infinite = loop && preset.cssClass.includes('animate__animated') ? ' animate__infinite' : '';
  return `${preset.cssClass}${infinite}`;
}

export function getPreviewAnimationId(animation) {
  const config = normalizeAnimationConfig(animation);
  return config.active && config.active !== 'none' ? config.active : config.enter;
}
