const MAX_VIDEO_SIZE_BYTES = 500 * 1024 * 1024;
const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'];

export function validateVideoFile(file) {
  if (!file) {
    return { ok: false, message: 'ไม่พบไฟล์วิดีโอ' };
  }

  if (file.size > MAX_VIDEO_SIZE_BYTES) {
    return { ok: false, message: 'ขนาดไฟล์เกินขีดจำกัด 500MB' };
  }

  const dotIndex = file.name.lastIndexOf('.');
  const ext = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : '';
  if (!ALLOWED_VIDEO_EXTENSIONS.includes(ext)) {
    return { ok: false, message: 'ไม่รองรับประเภทไฟล์นี้ (รองรับเฉพาะ MP4, WebM, MOV, AVI, MKV)' };
  }

  return { ok: true };
}
