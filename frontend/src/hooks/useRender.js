import { useCallback } from 'react';
import { API, apiRequest } from '../api';

export function useRender({
  project,
  subtitles,
  wordsPerLine,
  style,
  audioSettings,
  renderOptions,
  replaceSubtitles,
  setIsDirty,
  setSaveStatus,
  setToast,
  setLoading,
}) {
  const saveSubtitles = useCallback(async (next = subtitles) => {
    if (!project || !next) return;

    const payload = { ...next, words_per_line: wordsPerLine };
    try {
      setSaveStatus('saving');
      const data = await apiRequest(`/api/project/${project.id}/subtitles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      replaceSubtitles(data);
      setIsDirty(false);
      setSaveStatus('saved');
      setToast('บันทึกแล้ว');
    } catch (error) {
      setSaveStatus('error');
      setToast(`บันทึกไม่สำเร็จ: ${error.message}`);
    }
  }, [project, replaceSubtitles, setIsDirty, setSaveStatus, setToast, subtitles, wordsPerLine]);

  const renderVideo = useCallback(async () => {
    if (!project) return;

    try {
      setLoading?.('render', true);
      setToast('กำลังเรนเดอร์...');
      const result = await apiRequest(`/api/project/${project.id}/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution: renderOptions.resolution,
          fps: renderOptions.fps,
          subtitle_type: renderOptions.subtitleType,
          style,
          audio: audioSettings,
        }),
      });
      setToast(result.message);
    } catch (error) {
      setToast(`เรนเดอร์ไม่สำเร็จ: ${error.message}`);
    } finally {
      setLoading?.('render', false);
    }
  }, [audioSettings, project, renderOptions, setLoading, setToast, style]);

  const exportSubtitles = useCallback(async (format) => {
    if (!project) return;

    try {
      setToast('กำลังส่งออกไฟล์ซับ...');
      const result = await apiRequest(`/api/project/${project.id}/subtitles/export?output_format=${format}`, { method: 'POST' });
      const fileUrl = `${API}${result.output_url}`;
      const response = await fetch(fileUrl);
      if (!response.ok) throw new Error('ดาวน์โหลดไฟล์จากเซิร์ฟเวอร์ล้มเหลว');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const cleanProjectName = project.name.replace(/[\\/*?:"<>|]/g, '') || 'subtitles';

      link.href = url;
      link.download = `${cleanProjectName}.${format}`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      link.remove();

      setToast(`ส่งออกและดาวน์โหลดไฟล์ ${format.toUpperCase()} สำเร็จ`);
    } catch (error) {
      setToast(`ส่งออกซับไม่สำเร็จ: ${error.message}`);
    }
  }, [project, setToast]);

  return {
    saveSubtitles,
    renderVideo,
    exportSubtitles,
  };
}
