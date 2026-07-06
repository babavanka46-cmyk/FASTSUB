import { getSegmentText, joinCaptionText, normalizeCaptionText } from '../subtitleUtils';

function cloneDocument(subtitles) {
  return structuredClone(subtitles);
}

function findSegmentIndex(subtitles, segmentId) {
  return (subtitles?.segments || []).findIndex((segment) => segment.id === segmentId);
}

export function updateCaptionText(subtitles, wordRefs, nextText) {
  if (!subtitles || !Array.isArray(wordRefs) || wordRefs.length === 0) {
    return { ok: false, subtitles };
  }

  const segmentIds = new Set(wordRefs.map((ref) => ref.segmentId).filter(Boolean));
  if (!segmentIds.size) return { ok: false, subtitles };

  const next = cloneDocument(subtitles);
  const normalized = normalizeCaptionText(nextText);
  let changed = false;

  next.segments.forEach((segment) => {
    if (!segmentIds.has(segment.id)) return;
    if (normalizeCaptionText(segment.text || '') === normalized) return;

    segment.text = normalized;
    changed = true;
  });

  return { ok: changed, subtitles: changed ? next : subtitles };
}

export function updateSubtitleWord(subtitles, segmentId, wordId, text) {
  if (!subtitles) return { ok: false, subtitles };

  const next = cloneDocument(subtitles);
  const segment = next.segments.find((item) => item.id === segmentId);
  const word = segment?.words?.find((item) => item.id === wordId);
  if (!segment || !word) return { ok: false, subtitles };

  word.text = normalizeCaptionText(text);
  segment.text = joinCaptionText((segment.words || []).map((item) => item.text));

  return { ok: true, subtitles: next };
}

export function deleteSubtitleWord(subtitles, segmentId, wordId) {
  if (!subtitles) return { ok: false, subtitles };

  const next = cloneDocument(subtitles);
  const segment = next.segments.find((item) => item.id === segmentId);
  if (!segment) return { ok: false, subtitles };

  segment.words = (segment.words || []).filter((item) => item.id !== wordId);
  segment.text = joinCaptionText(segment.words.map((item) => item.text));

  return { ok: true, subtitles: next };
}

export function addSubtitleSegment(subtitles, afterSegmentId, createId) {
  if (!subtitles) return { ok: false, subtitles };

  const next = cloneDocument(subtitles);
  const idx = findSegmentIndex(next, afterSegmentId);
  if (idx === -1) return { ok: false, subtitles };

  const segment = next.segments[idx];
  const nextSegment = next.segments[idx + 1];
  const minDuration = 0.35;
  const start = Number(segment.end) || 0;
  const availableEnd = nextSegment ? Number(nextSegment.start) || start : start + 1.0;
  const end = availableEnd - start >= minDuration ? availableEnd : start + minDuration;

  next.segments.splice(idx + 1, 0, {
    id: createId('seg'),
    start,
    end,
    text: '',
    words: [],
  });

  return {
    ok: true,
    subtitles: next,
    startTime: start + 0.001,
  };
}

export function mergeSubtitleSegments(subtitles, segmentIdA, segmentIdB) {
  if (!subtitles) return { ok: false, subtitles };

  const next = cloneDocument(subtitles);
  const idxA = findSegmentIndex(next, segmentIdA);
  const idxB = findSegmentIndex(next, segmentIdB);
  if (idxA === -1 || idxB === -1 || idxA === idxB) return { ok: false, subtitles };

  const firstIndex = Math.min(idxA, idxB);
  const secondIndex = Math.max(idxA, idxB);
  const segA = next.segments[firstIndex];
  const segB = next.segments[secondIndex];

  const mergedText = joinCaptionText([getSegmentText(segA), getSegmentText(segB)]);
  segA.start = Math.min(Number(segA.start) || 0, Number(segB.start) || Number(segA.start) || 0);
  segA.end = Math.max(Number(segA.end) || 0, Number(segB.end) || Number(segA.end) || 0);
  segA.words = [...(segA.words || []), ...(segB.words || [])];
  segA.text = mergedText;

  next.segments.splice(secondIndex, 1);

  return {
    ok: true,
    subtitles: next,
    startTime: (Number(segA.start) || 0) + 0.001,
  };
}

export function mergeSubtitleWords(subtitles, segmentId, wordIdA, wordIdB) {
  if (!subtitles) return { ok: false, subtitles };

  const next = cloneDocument(subtitles);
  const segment = next.segments.find((item) => item.id === segmentId);
  if (!segment?.words?.length) return { ok: false, subtitles };

  const idxA = segment.words.findIndex((word) => word.id === wordIdA);
  const idxB = segment.words.findIndex((word) => word.id === wordIdB);
  if (idxA === -1 || idxB === -1 || idxA === idxB) return { ok: false, subtitles };

  const firstIndex = Math.min(idxA, idxB);
  const secondIndex = Math.max(idxA, idxB);
  if (secondIndex !== firstIndex + 1) return { ok: false, subtitles };

  const first = segment.words[firstIndex];
  const second = segment.words[secondIndex];

  first.text = joinCaptionText([first.text, second.text]);
  first.start = Math.min(Number(first.start) || 0, Number(second.start) || Number(first.start) || 0);
  first.end = Math.max(Number(first.end) || 0, Number(second.end) || Number(first.end) || 0);
  segment.words.splice(secondIndex, 1);
  segment.start = segment.words.length ? segment.words[0].start : segment.start;
  segment.end = segment.words.length ? segment.words[segment.words.length - 1].end : segment.end;
  segment.text = joinCaptionText(segment.words.map((word) => word.text));

  return {
    ok: true,
    subtitles: next,
    startTime: (Number(first.start) || 0) + 0.001,
  };
}

export function addSubtitleWord(subtitles, afterWordId, createId) {
  if (!subtitles) return { ok: false, subtitles };

  const next = cloneDocument(subtitles);
  let parentSegment = null;
  let wordIdx = -1;

  for (const segment of next.segments) {
    const idx = (segment.words || []).findIndex((word) => word.id === afterWordId);
    if (idx !== -1) {
      parentSegment = segment;
      wordIdx = idx;
      break;
    }
  }

  if (!parentSegment || wordIdx === -1) return { ok: false, subtitles };

  const word = parentSegment.words[wordIdx];
  let nextWord = null;

  if (wordIdx + 1 < parentSegment.words.length) {
    nextWord = parentSegment.words[wordIdx + 1];
  } else {
    const segIdx = next.segments.indexOf(parentSegment);
    const nextSegment = segIdx !== -1 ? next.segments[segIdx + 1] : null;
    nextWord = nextSegment?.words?.[0] || null;
  }

  const start = Number(word.end) || Number(word.start) || 0;
  let end = nextWord ? Number(nextWord.start) || start + 0.4 : start + 0.4;
  if (end <= start) end = start + 0.4;

  parentSegment.words.splice(wordIdx + 1, 0, {
    id: createId('word'),
    text: '',
    start,
    end,
  });
  parentSegment.text = joinCaptionText(parentSegment.words.map((item) => item.text));

  return {
    ok: true,
    subtitles: next,
    startTime: start + 0.001,
  };
}

function splitTextCue(subtitles, segmentIndex, request, createId) {
  const next = cloneDocument(subtitles);
  const segment = next.segments[segmentIndex];
  const sourceText = getSegmentText(segment);
  const charOffset = Math.max(1, Math.min(sourceText.length - 1, Number(request.charOffset) || 0));

  if (sourceText.length < 2 || charOffset <= 0 || charOffset >= sourceText.length) {
    return { ok: false, subtitles, message: 'วางเคอร์เซอร์กลางข้อความเพื่อแยกซับ' };
  }

  const leftText = sourceText.slice(0, charOffset).trim();
  const rightText = sourceText.slice(charOffset).trim();
  if (!leftText || !rightText) {
    return { ok: false, subtitles, message: 'ตำแหน่งนี้แยกข้อความไม่ได้' };
  }

  const segmentStart = Number(segment.start) || 0;
  const segmentEnd = Number(segment.end) || segmentStart + 0.5;
  const segmentDuration = Math.max(0.05, segmentEnd - segmentStart);
  const splitRatio = charOffset / sourceText.length;
  const splitTime = Math.min(
    segmentEnd - 0.01,
    Math.max(segmentStart + 0.01, segmentStart + segmentDuration * splitRatio)
  );

  segment.start = segmentStart;
  segment.end = splitTime;
  segment.text = leftText;
  segment.words = [{
    id: createId('word'),
    text: leftText,
    start: segmentStart,
    end: splitTime,
  }];

  const newSegment = {
    ...segment,
    id: createId('seg'),
    start: splitTime,
    end: segmentEnd,
    text: rightText,
    words: [{
      id: createId('word'),
      text: rightText,
      start: splitTime,
      end: segmentEnd,
    }],
  };

  next.segments.splice(segmentIndex + 1, 0, newSegment);
  return {
    ok: true,
    subtitles: next,
    startTime: splitTime + 0.001,
    message: 'แยกซับตามตำแหน่งเคอร์เซอร์เรียบร้อย',
  };
}

function splitInsideWord(subtitles, segmentIndex, words, wordIndex, request, createId) {
  const next = cloneDocument(subtitles);
  const segment = next.segments[segmentIndex];
  const sourceWord = (segment.words || [])[wordIndex];
  const sourceText = String(sourceWord?.text || '').trim();
  const charOffset = Math.max(1, Math.min(sourceText.length - 1, Number(request.charOffset) || 0));

  if (sourceText.length < 2 || charOffset <= 0 || charOffset >= sourceText.length) {
    return { ok: false, subtitles, message: 'วางเคอร์เซอร์กลางคำเพื่อผ่าคำนั้น' };
  }

  const leftText = sourceText.slice(0, charOffset).trim();
  const rightText = sourceText.slice(charOffset).trim();
  if (!leftText || !rightText) {
    return { ok: false, subtitles, message: 'ตำแหน่งนี้แยกคำไม่ได้' };
  }

  const wordStart = Number(sourceWord.start) || Number(segment.start) || 0;
  const wordEnd = Number(sourceWord.end) || wordStart + 0.2;
  const wordDuration = Math.max(0.02, wordEnd - wordStart);
  const splitRatio = charOffset / sourceText.length;
  const splitTime = Math.min(
    wordEnd - 0.01,
    Math.max(wordStart + 0.01, wordStart + wordDuration * splitRatio)
  );

  const leftWord = { ...sourceWord, text: leftText, end: splitTime };
  const rightWord = {
    ...sourceWord,
    id: createId('word'),
    text: rightText,
    start: splitTime,
    end: wordEnd,
  };

  const firstWords = [...words.slice(0, wordIndex), leftWord];
  const secondWords = [rightWord, ...words.slice(wordIndex + 1)];
  applySplitWords(next, segmentIndex, firstWords, secondWords, createId);

  return {
    ok: true,
    subtitles: next,
    startTime: (Number(secondWords[0]?.start) || splitTime) + 0.001,
    message: 'แยกคำตามตำแหน่งเคอร์เซอร์เรียบร้อย',
  };
}

function applySplitWords(next, segmentIndex, firstWords, secondWords, createId) {
  const segment = next.segments[segmentIndex];
  const firstStart = Number(firstWords[0]?.start ?? segment.start) || 0;
  const firstEnd = Number(firstWords[firstWords.length - 1]?.end ?? segment.end) || firstStart;
  const secondStart = Number(secondWords[0]?.start ?? firstEnd) || firstEnd;
  const secondEnd = Number(secondWords[secondWords.length - 1]?.end ?? segment.end) || secondStart;

  segment.start = firstStart;
  segment.end = firstEnd;
  segment.words = firstWords;
  segment.text = joinCaptionText(firstWords.map((word) => word.text));

  const newSegment = {
    ...segment,
    id: createId('seg'),
    start: secondStart,
    end: secondEnd,
    text: joinCaptionText(secondWords.map((word) => word.text)),
    words: secondWords,
  };

  next.segments.splice(segmentIndex + 1, 0, newSegment);
}

export function splitSubtitleSegment(subtitles, segmentIdOrRequest, wordId, createId) {
  if (!subtitles) return { ok: false, subtitles };

  const request = typeof segmentIdOrRequest === 'object' && segmentIdOrRequest !== null
    ? segmentIdOrRequest
    : { type: 'boundary', segmentId: segmentIdOrRequest, wordId };
  const segmentIndex = findSegmentIndex(subtitles, request.segmentId);
  if (segmentIndex === -1) return { ok: false, subtitles };

  if (request.type === 'text-cursor') {
    return splitTextCue(subtitles, segmentIndex, request, createId);
  }

  const segment = subtitles.segments[segmentIndex];
  const words = segment.words || [];
  const wordIndex = words.findIndex((word) => word.id === request.wordId);
  if (wordIndex === -1) return { ok: false, subtitles };

  let splitAfterIndex = wordIndex;

  if (request.type === 'before-word') {
    splitAfterIndex = wordIndex - 1;
    if (splitAfterIndex < 0) {
      return { ok: false, subtitles, message: 'ตำแหน่งนี้อยู่ต้นช่วงซับแล้ว ยังแยกไม่ได้' };
    }
  }

  if (request.type === 'inside-word') {
    return splitInsideWord(subtitles, segmentIndex, words, wordIndex, request, createId);
  }

  if (splitAfterIndex >= words.length - 1) {
    return { ok: false, subtitles, message: 'ต้องเลือกคำที่ยังมีคำถัดไปเพื่อแยกซับ' };
  }

  const next = cloneDocument(subtitles);
  const firstWords = words.slice(0, splitAfterIndex + 1);
  const secondWords = words.slice(splitAfterIndex + 1);
  applySplitWords(next, segmentIndex, firstWords, secondWords, createId);

  return {
    ok: true,
    subtitles: next,
    startTime: (Number(secondWords[0]?.start) || 0) + 0.001,
    message: 'แยกซับไตเติลเรียบร้อย',
  };
}

export function regroupSubtitlesByWordsPerLine(subtitles, wordsPerLine, createId) {
  if (!subtitles?.segments) return { ok: false, subtitles };

  const allWords = subtitles.segments.flatMap((s) => s.words || [])
    .filter((w) => String(w.text || '').trim())
    .map((w) => ({ ...w })); // copy objects

  if (allWords.length === 0) return { ok: false, subtitles };

  const newSegments = [];
  let currentSegmentWords = [];
  const maxGapSeconds = 1.2; // split if pause is longer than 1.2s

  for (let i = 0; i < allWords.length; i++) {
    const word = allWords[i];
    const prevWord = allWords[i - 1];

    const hasBigGap = prevWord && (Number(word.start) - Number(prevWord.end) > maxGapSeconds);

    if (currentSegmentWords.length >= wordsPerLine || hasBigGap) {
      if (currentSegmentWords.length > 0) {
        newSegments.push(createSegmentFromWords(currentSegmentWords, createId));
        currentSegmentWords = [];
      }
    }
    currentSegmentWords.push(word);
  }

  if (currentSegmentWords.length > 0) {
    newSegments.push(createSegmentFromWords(currentSegmentWords, createId));
  }

  const nextSubtitles = {
    ...subtitles,
    segments: newSegments,
  };

  return { ok: true, subtitles: nextSubtitles };
}

function createSegmentFromWords(words, createId) {
  const start = Number(words[0].start) || 0;
  const end = Number(words[words.length - 1].end) || start + 0.3;
  return {
    id: createId('seg'),
    start,
    end,
    text: joinCaptionText(words.map((w) => w.text)),
    words,
  };
}
