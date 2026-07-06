export function formatPrecise(value = 0) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  const millis = Math.floor((value % 1) * 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

export function getActivePreviewWords(segment, currentTime, wordsPerLine) {
  const words = segment?.words || [];
  if (!words.length) return [];
  const safeWordsPerLine = Math.max(1, Math.min(5, Number(wordsPerLine) || 3));
  const activeIndex = words.findIndex((word) => currentTime >= word.start && currentTime <= word.end);
  const index = activeIndex >= 0 ? activeIndex : 0;
  const lineStart = Math.floor(index / safeWordsPerLine) * safeWordsPerLine;
  return words.slice(lineStart, lineStart + safeWordsPerLine);
}
