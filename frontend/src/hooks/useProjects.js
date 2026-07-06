import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from '../api';
import { validateVideoFile } from '../utils/videoUploadValidation';

export function useProjects({
  defaultStyle,
  defaultAudioSettings,
  defaultRenderOptions,
  resetSubtitles,
  setVideoDuration,
  setStyle,
  setAudioSettings,
  setRenderOptions,
  setWordsPerLine,
  setIsDirty,
  setSaveStatus,
  setToast,
  setLoading,
}) {
  const [project, setProject] = useState(null);
  const [projects, setProjects] = useState([]);

  const refreshProjects = useCallback(async () => {
    try {
      setLoading?.('projects', true);
      const data = await apiRequest('/api/projects');
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      setProjects([]);
    } finally {
      setLoading?.('projects', false);
    }
  }, [setLoading]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  useEffect(() => {
    if (!project) {
      resetSubtitles(null);
      return undefined;
    }

    const controller = new AbortController();
    const { signal } = controller;

    resetSubtitles(null);
    setIsDirty?.(false);
    setSaveStatus?.('saved');

    async function loadSubtitles() {
      try {
        const data = await apiRequest(`/api/project/${project.id}/subtitles`, { signal });
        resetSubtitles(data);
        setWordsPerLine(data.words_per_line || 3);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setToast(`โหลดคำบรรยายล้มเหลว: ${err.message}`);
        }
      }
    }

    loadSubtitles();

    return () => {
      controller.abort();
    };
  }, [project, resetSubtitles, setIsDirty, setSaveStatus, setToast, setWordsPerLine]);

  const openProject = useCallback((id) => {
    resetSubtitles(null);
    setVideoDuration(0);

    const selected = projects.find((item) => item.id === id);
    setProject(selected || null);

    if (selected?.settings) {
      setStyle(selected.settings.style || defaultStyle);
      setAudioSettings(selected.settings.audio || defaultAudioSettings);
      setRenderOptions(selected.settings.renderOptions || defaultRenderOptions);
      if (selected.settings.wordsPerLine) setWordsPerLine(selected.settings.wordsPerLine);
      return;
    }

    setStyle(defaultStyle);
    setAudioSettings(defaultAudioSettings);
    setRenderOptions(defaultRenderOptions);
  }, [
    defaultAudioSettings,
    defaultRenderOptions,
    defaultStyle,
    projects,
    resetSubtitles,
    setAudioSettings,
    setRenderOptions,
    setStyle,
    setVideoDuration,
    setWordsPerLine,
  ]);

  const uploadVideo = useCallback(async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validation = validateVideoFile(file);
    if (!validation.ok) {
      setToast(validation.message);
      event.target.value = '';
      return;
    }

    const form = new FormData();
    form.append('file', file);

    try {
      setLoading?.('upload', true);
      setToast('กำลังอัปโหลด...');
      setVideoDuration(0);
      const created = await apiRequest('/api/projects/upload', { method: 'POST', body: form });
      setProject(created);
      setProjects((items) => [created, ...items]);
      setToast('อัปโหลดวิดีโอแล้ว');
    } catch (error) {
      setToast(`อัปโหลดไม่สำเร็จ: ${error.message}`);
    } finally {
      setLoading?.('upload', false);
      event.target.value = '';
    }
  }, [setLoading, setToast, setVideoDuration]);

  const updateProjectSettings = useCallback((projectId, settings) => {
    setProjects((currentProjects) =>
      currentProjects.map((item) => (item.id === projectId ? { ...item, settings } : item))
    );
  }, []);

  return {
    project,
    projects,
    setProject,
    refreshProjects,
    openProject,
    uploadVideo,
    updateProjectSettings,
  };
}
