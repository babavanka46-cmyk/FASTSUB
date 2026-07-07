import { describe, it, expect } from 'vitest';
import {
  updateCaptionText,
  updateSubtitleWord,
  deleteSubtitleWord,
  deleteSubtitleRow,
  addSubtitleSegment,
  mergeSubtitleSegments,
  mergeSubtitleWords,
  addSubtitleWord,
  splitSubtitleSegment,
  regroupSubtitlesByWordsPerLine,
} from './subtitleDocument';

// Mock ID generator function
const mockCreateId = (prefix) => `${prefix}_mock_${Math.random().toString(36).substring(2, 6)}`;

describe('Subtitle Document Mutations', () => {
  const getInitialSubtitles = () => ({
    project_id: 'test_project',
    language: 'th',
    words_per_line: 3,
    segments: [
      {
        id: 'seg_1',
        start: 0.0,
        end: 2.0,
        text: 'แถมยังต้อง',
        words: [
          { id: 'w1', text: 'แถม', start: 0.0, end: 0.5 },
          { id: 'w2', text: 'ยัง', start: 0.5, end: 1.0 },
          { id: 'w3', text: 'ต้อง', start: 1.0, end: 2.0 },
        ],
      },
      {
        id: 'seg_2',
        start: 2.5,
        end: 4.0,
        text: 'คิดพร้อม',
        words: [
          { id: 'w4', text: 'คิด', start: 2.5, end: 3.0 },
          { id: 'w5', text: 'พร้อม', start: 3.0, end: 4.0 },
        ],
      },
    ],
  });

  describe('updateCaptionText', () => {
    it('should update segment text when matches segmentId', () => {
      const subs = getInitialSubtitles();
      const refs = [{ segmentId: 'seg_1', wordId: 'w1' }];
      const result = updateCaptionText(subs, refs, 'ใหม่ทั้งหมด');
      expect(result.ok).toBe(true);
      expect(result.subtitles.segments[0].text).toBe('ใหม่ทั้งหมด');
    });

    it('should not update if text is identical', () => {
      const subs = getInitialSubtitles();
      const refs = [{ segmentId: 'seg_1', wordId: 'w1' }];
      const result = updateCaptionText(subs, refs, 'แถมยังต้อง');
      expect(result.ok).toBe(false);
    });
  });

  describe('updateSubtitleWord', () => {
    it('should update specific word text and sync segment text', () => {
      const subs = getInitialSubtitles();
      const result = updateSubtitleWord(subs, 'seg_1', 'w2', 'ยังคง');
      expect(result.ok).toBe(true);
      expect(result.subtitles.segments[0].words[1].text).toBe('ยังคง');
      expect(result.subtitles.segments[0].text).toBe('แถมยังคงต้อง');
    });
  });

  describe('deleteSubtitleWord', () => {
    it('should delete a word from words array and sync segment text', () => {
      const subs = getInitialSubtitles();
      const result = deleteSubtitleWord(subs, 'seg_1', 'w2');
      expect(result.ok).toBe(true);
      expect(result.subtitles.segments[0].words).toHaveLength(2);
      expect(result.subtitles.segments[0].words[1].id).toBe('w3');
      expect(result.subtitles.segments[0].text).toBe('แถมต้อง');
    });
  });

  describe('deleteSubtitleRow', () => {
    it('should delete multiple words in one transaction and sync segment text', () => {
      const subs = getInitialSubtitles();
      const result = deleteSubtitleRow(subs, 'seg_1', ['w1', 'w2']);
      expect(result.ok).toBe(true);
      expect(result.subtitles.segments[0].words).toHaveLength(1);
      expect(result.subtitles.segments[0].words[0].id).toBe('w3');
      expect(result.subtitles.segments[0].text).toBe('ต้อง');
      expect(subs.segments[0].words).toHaveLength(3);
    });
  });
  describe('addSubtitleSegment', () => {
    it('should insert a blank segment after specified segment ID', () => {
      const subs = getInitialSubtitles();
      const result = addSubtitleSegment(subs, 'seg_1', mockCreateId);
      expect(result.ok).toBe(true);
      expect(result.subtitles.segments).toHaveLength(3);
      expect(result.subtitles.segments[1].start).toBe(2.0); // starts after seg_1 ends
      expect(result.subtitles.segments[1].end).toBe(2.5); // ends at seg_2 start
    });
  });

  describe('mergeSubtitleSegments', () => {
    it('should merge two adjacent segments correctly', () => {
      const subs = getInitialSubtitles();
      const result = mergeSubtitleSegments(subs, 'seg_1', 'seg_2');
      expect(result.ok).toBe(true);
      expect(result.subtitles.segments).toHaveLength(1);
      const merged = result.subtitles.segments[0];
      expect(merged.start).toBe(0.0);
      expect(merged.end).toBe(4.0);
      expect(merged.words).toHaveLength(5);
      expect(merged.text).toBe('แถมยังต้องคิดพร้อม');
    });
  });

  describe('mergeSubtitleWords', () => {
    it('should merge two adjacent words inside same segment', () => {
      const subs = getInitialSubtitles();
      const result = mergeSubtitleWords(subs, 'seg_1', 'w1', 'w2');
      expect(result.ok).toBe(true);
      const segment = result.subtitles.segments[0];
      expect(segment.words).toHaveLength(2);
      expect(segment.words[0].text).toBe('แถมยัง');
      expect(segment.words[0].start).toBe(0.0);
      expect(segment.words[0].end).toBe(1.0);
      expect(segment.text).toBe('แถมยังต้อง');
    });
  });

  describe('addSubtitleWord', () => {
    it('should add a word after specified word ID', () => {
      const subs = getInitialSubtitles();
      const result = addSubtitleWord(subs, 'w1', mockCreateId);
      expect(result.ok).toBe(true);
      const segment = result.subtitles.segments[0];
      expect(segment.words).toHaveLength(4);
      expect(segment.words[1].text).toBe('');
      expect(segment.words[1].start).toBe(0.5);
    });
  });

  describe('splitSubtitleSegment', () => {
    it('should split segment at word boundary', () => {
      const subs = getInitialSubtitles();
      // split segment 1 at w2 (split point is after w2)
      const result = splitSubtitleSegment(subs, 'seg_1', 'w2', mockCreateId);
      expect(result.ok).toBe(true);
      expect(result.subtitles.segments).toHaveLength(3);

      const leftSeg = result.subtitles.segments[0];
      const rightSeg = result.subtitles.segments[1];

      expect(leftSeg.words).toHaveLength(2);
      expect(leftSeg.text).toBe('แถมยัง');
      expect(leftSeg.end).toBe(1.0);

      expect(rightSeg.words).toHaveLength(1);
      expect(rightSeg.text).toBe('ต้อง');
      expect(rightSeg.start).toBe(1.0);
      expect(rightSeg.end).toBe(2.0);
    });

    it('should split segment inside a word text', () => {
      const subs = getInitialSubtitles();
      // split "ต้อง" (w3) at offset 2 (ต้อ | ง)
      const request = {
        type: 'inside-word',
        segmentId: 'seg_1',
        wordId: 'w3',
        charOffset: 2,
      };
      const result = splitSubtitleSegment(subs, request, null, mockCreateId);
      expect(result.ok).toBe(true);
      expect(result.subtitles.segments).toHaveLength(3);

      const splitSeg = result.subtitles.segments[1]; // segment created from split remainder
      expect(splitSeg.words[0].text).toBe('อง');
    });
  });

  describe('regroupSubtitlesByWordsPerLine', () => {
    it('should regroup words into chunks of specified wordsPerLine', () => {
      const subs = getInitialSubtitles();
      const result = regroupSubtitlesByWordsPerLine(subs, 2, mockCreateId);
      expect(result.ok).toBe(true);
      expect(result.subtitles.segments).toHaveLength(3);
      expect(result.subtitles.segments[0].words).toHaveLength(2);
      expect(result.subtitles.segments[1].words).toHaveLength(2);
      expect(result.subtitles.segments[2].words).toHaveLength(1);
    });

    it('should split segments if the gap between words exceeds threshold', () => {
      const subs = getInitialSubtitles();
      subs.segments[1].words[0].start = 4.0;
      subs.segments[1].words[0].end = 4.5;
      subs.segments[1].words[1].start = 4.5;
      subs.segments[1].words[1].end = 5.0;

      const result = regroupSubtitlesByWordsPerLine(subs, 4, mockCreateId);
      expect(result.ok).toBe(true);
      expect(result.subtitles.segments).toHaveLength(2);
      expect(result.subtitles.segments[0].words).toHaveLength(3);
      expect(result.subtitles.segments[1].words).toHaveLength(2);
    });
  });
});
