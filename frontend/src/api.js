export const API = import.meta.env.VITE_API_URL || 'http://localhost:8100';

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();
  if (!response.ok) {
    const detail = typeof payload === 'object' && payload?.detail ? payload.detail : payload;
    throw new Error(detail || `Request failed with status ${response.status}`);
  }
  return payload;
}
