export const API = import.meta.env.VITE_API_URL || 'http://localhost:8100';

export function mediaUrl(relativePath) {
  if (!relativePath) return null;
  const normalized = String(relativePath).replaceAll('\\', '/').replace(/^\/+/, '');
  if (normalized.startsWith('media/')) return `${API}/${normalized}`;
  return `${API}/media/${normalized}`;
}

export async function apiRequest(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout ?? 60000);
  try {
    const response = await fetch(`${API}${path}`, {
      ...options,
      signal: options.signal ?? controller.signal,
    });
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('application/json')
      ? await response.json()
      : await response.text();
    if (!response.ok) {
      const detail = typeof payload === 'object' && payload?.detail
        ? (Array.isArray(payload.detail)
          ? payload.detail.map((item) => item?.msg || JSON.stringify(item)).join('; ')
          : payload.detail)
        : payload;
      throw new Error(detail || `Request failed with status ${response.status}`);
    }
    return payload;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('คำขอหมดเวลา (timeout) ลองใหม่อีกครั้ง');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export function uploadWithProgress(path, formData, { onProgress } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API}${path}`);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      try {
        const data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
        if (xhr.status >= 200 && xhr.status < 300) resolve(data);
        else reject(new Error(data.detail || `Upload failed (${xhr.status})`));
      } catch (e) {
        reject(new Error('Invalid response from server'));
      }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    xhr.send(formData);
  });
}
