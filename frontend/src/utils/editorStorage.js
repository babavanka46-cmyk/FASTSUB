export const storageKeys = {
  animationFavorites: 'fastsub_fav_anims',
  animationRecents: 'fastsub_recent_anims',
  animationSlotSoundEnabled: 'editor.animationSlotSoundEnabled',
  geminiApiKey: 'gemini_api_key',
};

function canUseStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage);
}

export function getStoredString(key, fallback = '') {
  if (!canUseStorage()) return fallback;
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function setStoredString(key, value) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Local editor settings are best-effort only.
  }
}

export function getStoredBoolean(key, fallback = false) {
  const value = getStoredString(key, String(fallback));
  if (value === 'true') return true;
  if (value === 'false') return false;
  return fallback;
}

export function setStoredBoolean(key, value) {
  setStoredString(key, String(Boolean(value)));
}

export function getStoredJson(key, fallback) {
  const value = getStoredString(key, '');
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function setStoredJson(key, value) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Local editor settings are best-effort only.
  }
}
