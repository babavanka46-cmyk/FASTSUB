import { useEffect, useRef } from 'react';
import { apiRequest } from '../api';

export function useSubtitlesAutosave({
  project,
  subtitles,
  wordsPerLine,
  isDirty,
  onSaved,
  onStatus,
  onError,
}) {
  const saveSeq = useRef(0);

  useEffect(() => {
    if (!project || !subtitles || !isDirty) return undefined;

    onStatus?.('dirty');
    const seq = saveSeq.current + 1;
    saveSeq.current = seq;

    const timer = setTimeout(async () => {
      try {
        onStatus?.('saving');
        const payload = { ...subtitles, words_per_line: wordsPerLine };
        await apiRequest(`/api/project/${project.id}/subtitles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (seq !== saveSeq.current) return;
        onSaved?.();
        onStatus?.('saved');
      } catch (err) {
        if (seq !== saveSeq.current) return;
        onStatus?.('error');
        onError?.(err);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [project, subtitles, wordsPerLine, isDirty, onSaved, onStatus, onError]);
}

export function useProjectSettingsAutosave({
  project,
  style,
  audioSettings,
  renderOptions,
  wordsPerLine,
  onSaved,
  onError,
}) {
  const saveSeq = useRef(0);

  useEffect(() => {
    if (!project) return undefined;

    const seq = saveSeq.current + 1;
    saveSeq.current = seq;

    const timer = setTimeout(async () => {
      try {
        const payload = {
          style,
          audio: audioSettings,
          renderOptions,
          wordsPerLine,
        };
        await apiRequest(`/api/project/${project.id}/settings`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (seq !== saveSeq.current) return;
        onSaved?.(payload);
      } catch (err) {
        if (seq !== saveSeq.current) return;
        onError?.(err);
      }
    }, 2000);

    return () => clearTimeout(timer);
  }, [project, style, audioSettings, renderOptions, wordsPerLine, onSaved, onError]);
}
