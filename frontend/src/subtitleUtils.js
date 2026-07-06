export function formatPrecise(value = 0) {
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60);
  const millis = Math.floor((value % 1) * 1000);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(millis).padStart(3, '0')}`;
}

const THAI_CHAR_RE = /[\u0E00-\u0E7F]/;
const LEADING_PUNCTUATION_RE = /^[,.;:!?%)]/;
const TRAILING_PUNCTUATION_RE = /[(]$/;
const THAI_TEXT_RE = /[\u0E00-\u0E7F]/;
const THAI_GAP_RE = /([\u0E00-\u0E7F])\s+([\u0E00-\u0E7F])/g;
const SINGLE_LATIN_GAP_RE = /\b([A-Za-z])\s+(?=[A-Za-z]\b)/g;

export function normalizeCaptionText(value = '') {
  let text = String(value || '').replace(/\s+/g, ' ').trim();
  let previous = '';

  while (text !== previous) {
    previous = text;
    text = text
      .replace(THAI_GAP_RE, '$1$2')
      .replace(SINGLE_LATIN_GAP_RE, '$1');
  }

  return text;
}

export function tokenizeCaptionText(value = '') {
  const text = normalizeCaptionText(value);
  if (!text) return [];

  if (!THAI_TEXT_RE.test(text)) {
    return text.split(/\s+/).filter(Boolean);
  }

  const segments = [];
  for (const part of text.split(/\s+/).filter(Boolean)) {
    if (!THAI_TEXT_RE.test(part)) {
      segments.push(part);
      continue;
    }

    try {
      if (typeof Intl !== 'undefined' && Intl.Segmenter) {
        const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
        const wordLike = Array.from(segmenter.segment(part))
          .filter((item) => item.isWordLike)
          .map((item) => item.segment.trim())
          .filter(Boolean);
        if (wordLike.length) {
          segments.push(...wordLike);
          continue;
        }
      }
    } catch {
      // Browser segmentation is best-effort. Fall back to the normalized part.
    }

    segments.push(part);
  }

  return segments;
}

export function joinCaptionText(parts = []) {
  return parts
    .map((part) => normalizeCaptionText(part))
    .filter(Boolean)
    .reduce((text, part) => {
      if (!text) return part;
      const previous = text[text.length - 1] || '';
      const current = part[0] || '';
      const shouldJoinTight =
        (THAI_CHAR_RE.test(previous) && THAI_CHAR_RE.test(current)) ||
        LEADING_PUNCTUATION_RE.test(current) ||
        TRAILING_PUNCTUATION_RE.test(previous);
      return `${text}${shouldJoinTight ? '' : ' '}${part}`;
    }, '');
}

export function getSegmentWordText(segment) {
  return joinCaptionText((segment?.words || []).map((word) => word.text));
}

export function getSegmentText(segment) {
  const cueText = normalizeCaptionText(segment?.text || '');
  if (cueText) return cueText;
  return getSegmentWordText(segment);
}

export function isSegmentTextAuthoritative(segment) {
  const cueText = normalizeCaptionText(segment?.text || '');
  if (!cueText) return false;
  const wordText = normalizeCaptionText(getSegmentWordText(segment));
  return !wordText || cueText !== wordText;
}

function createCuePreviewWord(segment, text) {
  return {
    id: `${segment?.id || 'segment'}_cue_text`,
    segmentId: segment?.id,
    text,
    start: Number(segment?.start) || 0,
    end: Number(segment?.end) || Number(segment?.start) || 0,
    isCueText: true,
  };
}

export function getActivePreviewWords(segment) {
  if (!segment) return [];

  const cueText = getSegmentText(segment);
  const cleanWords = (segment.words || []).filter((word) => normalizeCaptionText(word.text));

  if (cueText && isSegmentTextAuthoritative(segment)) {
    return [createCuePreviewWord(segment, cueText)];
  }

  if (cleanWords.length) {
    return cleanWords;
  }

  return cueText ? [createCuePreviewWord(segment, cueText)] : [];
}

export function createId(prefix = 'id') {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}
