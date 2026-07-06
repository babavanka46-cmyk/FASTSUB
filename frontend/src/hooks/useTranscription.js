import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';

const defaultWhisperSettings = {
  language: 'th',
  model: 'small',
  device: 'cpu',
  computeType: 'int8',
  vadFilter: false,
};

export function useTranscription({
  project,
  subtitles,
  resetSubtitles,
  commitSubtitles,
  setIsDirty,
  setSaveStatus,
  setToast,
  setLoading,
}) {
  const [whisperStatus, setWhisperStatus] = useState(null);
  const [whisperSettings, setWhisperSettings] = useState(defaultWhisperSettings);

  const refreshWhisperStatus = useCallback(async () => {
    try {
      const status = await apiRequest('/api/whisper/status');
      setWhisperStatus(status);
      return status;
    } catch {
      setWhisperStatus(null);
      return null;
    }
  }, []);

  useEffect(() => {
    refreshWhisperStatus();
  }, [refreshWhisperStatus]);

  const transcribe = useCallback(async () => {
    if (!project) return;

    try {
      setLoading?.('transcribe', true);
      setToast('กำลังถอดเสียง...');
      const params = new URLSearchParams({
        language: whisperSettings.language,
        model: whisperSettings.model,
        device: whisperSettings.device,
        compute_type: whisperSettings.computeType,
        vad_filter: String(whisperSettings.vadFilter),
      });
      const data = await apiRequest(`/api/project/${project.id}/transcribe?${params.toString()}`, { method: 'POST' });
      resetSubtitles(data);
      await refreshWhisperStatus();
      setIsDirty(false);
      setSaveStatus('saved');
      setToast('ถอดเสียงเรียบร้อย');
    } catch (error) {
      setToast(`ถอดเสียงไม่สำเร็จ: ${error.message}`);
    } finally {
      setLoading?.('transcribe', false);
    }
  }, [
    project,
    refreshWhisperStatus,
    resetSubtitles,
    setIsDirty,
    setLoading,
    setSaveStatus,
    setToast,
    whisperSettings,
  ]);

  const autocorrect = useCallback(async (provider = 'local', geminiApiKey = '') => {
    if (!project || !subtitles) return;

    try {
      setLoading?.('autocorrect', true);
      setToast('กำลังตรวจคำ...');
      const payload = { provider };
      if (provider === 'gemini' && geminiApiKey) payload.api_key = geminiApiKey;

      const data = await apiRequest(`/api/project/${project.id}/autocorrect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      commitSubtitles(data);
      setToast('ตรวจคำเรียบร้อย');
    } catch (error) {
      setToast(`ตรวจคำไม่สำเร็จ: ${error.message}`);
    } finally {
      setLoading?.('autocorrect', false);
    }
  }, [commitSubtitles, project, setLoading, setToast, subtitles]);

  const repairThaiWords = useCallback(async () => {
    if (!project || !subtitles) return;

    try {
      setLoading?.('repairThai', true);
      setToast('กำลังซ่อมการแบ่งคำไทย...');
      const data = await apiRequest(`/api/project/${project.id}/subtitles/repair-thai-words`, { method: 'POST' });
      commitSubtitles(data);
      setToast('ซ่อมการแบ่งคำไทยเรียบร้อย');
    } catch (error) {
      setToast(`ซ่อมคำไทยไม่สำเร็จ: ${error.message}`);
    } finally {
      setLoading?.('repairThai', false);
    }
  }, [commitSubtitles, project, setLoading, setToast, subtitles]);

  return {
    whisperStatus,
    whisperSettings,
    setWhisperSettings,
    refreshWhisperStatus,
    transcribe,
    autocorrect,
    repairThaiWords,
  };
}
