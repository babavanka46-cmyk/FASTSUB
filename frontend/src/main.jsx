import React, { useCallback, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  createId,
  getActivePreviewWords,
} from './subtitleUtils';
import {
  addSubtitleSegment,
  addSubtitleWord,
  deleteSubtitleWord,
  deleteSubtitleRow,
  mergeSubtitleSegments,
  mergeSubtitleWords,
  splitSubtitleSegment,
  updateCaptionText,
  updateSubtitleWord,
  regroupSubtitlesByWordsPerLine,
} from './utils/subtitleDocument';
import { Landing } from './components/Landing';
import { Editor } from './components/Editor';
import { Toast } from './components/Toast';
import { useProjectSettingsAutosave, useSubtitlesAutosave } from './hooks/useAutosave';
import { useEditorHistory } from './hooks/useEditorHistory';
import { useProjects } from './hooks/useProjects';
import { useRender } from './hooks/useRender';
import { useTranscription } from './hooks/useTranscription';
import { EditorProvider } from './context/EditorContext';
import { apiRequest } from './api';
import './styles.css';
import './animate.css';

import { captionPresets } from './presets/captionPresets';

const defaultStyle = captionPresets[0];

const defaultAudioSettings = {
  bgm_path: null,
  bgm_volume: 0.18,
  bgm_loop: true,
  sfx_name: null,
  sfx_density: 0.2,
  sfx_volume: 0.35,
};

const defaultRenderOptions = { subtitleType: 'hard', resolution: '1080p', fps: 30 };

function App() {
  const [currentTime, setCurrentTime] = useState(0);
  const [style, setStyle] = useState(defaultStyle);
  const [activeTool, setActiveTool] = useState('styles');
  const [wordsPerLine, setWordsPerLine] = useState(3);
  const [audioSettings, setAudioSettings] = useState(defaultAudioSettings);
  const [renderOptions, setRenderOptions] = useState(defaultRenderOptions);
  const [toast, setToastState] = useState({ message: '', type: 'info' });
  const setToast = useCallback((msg, type = 'info') => {
    if (typeof msg === 'string') {
      setToastState({ message: msg, type });
    } else if (msg && typeof msg === 'object') {
      setToastState({ message: msg.message || '', type: msg.type || 'info' });
    } else {
      setToastState({ message: '', type: 'info' });
    }
  }, []);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'dirty', 'saving', 'error'
  const markSubtitlesDirty = useCallback(() => {
    setIsDirty(true);
    setSaveStatus('dirty');
  }, []);
  const {
    value: subtitles,
    replace: setSubtitles,
    reset: resetSubtitles,
    commit: pushToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useEditorHistory(null, { onDirty: markSubtitlesDirty });
  const [videoDuration, setVideoDuration] = useState(0);
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);
  const [activeJob, setActiveJob] = useState(null);
  const [isLoading, setIsLoading] = useState({
    projects: true,
    upload: false,
    transcribe: false,
    render: false,
    autocorrect: false,
    repairThai: false,
  });
  const videoRef = useRef(null);

  const updateLoading = useCallback((key, val) => {
    setIsLoading((prev) => ({ ...prev, [key]: val }));
  }, []);

  const cancelActiveJob = useCallback(async () => {
    if (!activeJob) return;
    try {
      setToast('กำลังส่งคำขอยกเลิกงาน...');
      await apiRequest(`/api/jobs/${activeJob.id}/cancel`, { method: 'POST' });
      setToast('ยกเลิกงานเรียบร้อยแล้ว');
      setActiveJob(null);
    } catch (err) {
      setToast(`ยกเลิกงานไม่สำเร็จ: ${err.message}`);
    }
  }, [activeJob]);

  const {
    project,
    projects,
    setProject,
    refreshProjects,
    refreshProject,
    openProject,
    uploadVideo,
    updateProjectSettings,
    uploadProgress,
  } = useProjects({
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
    setLoading: updateLoading,
  });

  const {
    whisperStatus,
    whisperSettings,
    setWhisperSettings,
    transcribe,
    autocorrect,
    repairThaiWords,
  } = useTranscription({
    project,
    subtitles,
    resetSubtitles,
    commitSubtitles: pushToHistory,
    setIsDirty,
    setSaveStatus,
    setToast,
    setLoading: updateLoading,
    onJobStart: (id, type) => setActiveJob({ id, type }),
    onJobEnd: () => setActiveJob(null),
  });

  const allWords = useMemo(() => {
    return (subtitles?.segments || []).flatMap((segment) => segment.words || []);
  }, [subtitles]);

  const duration = useMemo(() => {
    if (videoDuration > 0) return videoDuration;
    return Math.max(22, ...allWords.map((word) => word.end || 0), ...((subtitles?.segments || []).map((segment) => segment.end || 0)));
  }, [allWords, subtitles, videoDuration]);

  const activeWord = useMemo(() => {
    for (const segment of subtitles?.segments || []) {
      for (const word of segment.words || []) {
        if (currentTime >= word.start && currentTime <= word.end) return word.id;
      }
    }
    return null;
  }, [subtitles, currentTime]);

  const activeSegment = useMemo(() => {
    return (subtitles?.segments || []).find((segment) => currentTime >= segment.start && currentTime <= segment.end);
  }, [subtitles, currentTime]);

  const previewWords = useMemo(() => {
    return getActivePreviewWords(activeSegment, currentTime);
  }, [activeSegment, currentTime]);

  const handleSubtitlesAutosaved = useCallback(() => {
    setIsDirty(false);
  }, []);

  const handleSubtitlesAutosaveError = useCallback((err) => {
    setToast(`บันทึกอัตโนมัติล้มเหลว: ${err.message}`);
  }, []);

  const handleSettingsAutosaved = useCallback((payload) => {
    if (project?.id) updateProjectSettings(project.id, payload);
  }, [project?.id, updateProjectSettings]);

  const handleSettingsAutosaveError = useCallback((err) => {
    console.error('Failed to save project settings:', err);
  }, []);

  useSubtitlesAutosave({
    project,
    subtitles,
    wordsPerLine,
    isDirty,
    onSaved: handleSubtitlesAutosaved,
    onStatus: setSaveStatus,
    onError: handleSubtitlesAutosaveError,
  });

  useProjectSettingsAutosave({
    project,
    style,
    audioSettings,
    renderOptions,
    wordsPerLine,
    onSaved: handleSettingsAutosaved,
    onError: handleSettingsAutosaveError,
  });

  const {
    saveSubtitles,
    renderVideo,
    exportSubtitles,
  } = useRender({
    project,
    subtitles,
    wordsPerLine,
    style,
    audioSettings,
    renderOptions,
    replaceSubtitles: setSubtitles,
    setIsDirty,
    setSaveStatus,
    setToast,
    setLoading: updateLoading,
    onRendered: refreshProject,
    onJobStart: (id, type) => setActiveJob({ id, type }),
    onJobEnd: () => setActiveJob(null),
  });

  function updateWord(segmentId, wordId, text) {
    const result = updateSubtitleWord(subtitles, segmentId, wordId, text);
    if (!result.ok) return;
    pushToHistory(result.subtitles);
  }

  function updateRowText(wordRefs, nextText) {
    const result = updateCaptionText(subtitles, wordRefs, nextText);
    if (!result.ok) return;
    pushToHistory(result.subtitles);
  }

  function deleteWord(segmentId, wordId) {
    const result = deleteSubtitleWord(subtitles, segmentId, wordId);
    if (!result.ok) return;
    pushToHistory(result.subtitles);
  }

  function deleteRow(segmentId, wordIds) {
    const result = deleteSubtitleRow(subtitles, segmentId, wordIds);
    if (!result.ok) return;
    pushToHistory(result.subtitles);
  }

  function addSegment(afterSegmentId) {
    const result = addSubtitleSegment(subtitles, afterSegmentId, createId);
    if (!result.ok) return;
    pushToHistory(result.subtitles);
    setCurrentTime(result.startTime);
    setToast('เพิ่มช่วงซับไตเติลใหม่แล้ว');
  }

  function mergeSegments(segmentIdA, segmentIdB) {
    const result = mergeSubtitleSegments(subtitles, segmentIdA, segmentIdB);
    if (!result.ok) return;
    pushToHistory(result.subtitles);
    setCurrentTime(result.startTime);
    setToast('รวมช่วงซับไตเติลเรียบร้อย');
  }

  function mergeWords(segmentId, wordIdA, wordIdB) {
    const result = mergeSubtitleWords(subtitles, segmentId, wordIdA, wordIdB);
    if (!result.ok) return;
    pushToHistory(result.subtitles);
    setCurrentTime(result.startTime);
    setToast('รวมคำและเวลาเรียบร้อย');
  }

  function splitSegmentAtWord(segmentIdOrRequest, wordId) {
    const result = splitSubtitleSegment(subtitles, segmentIdOrRequest, wordId, createId);
    if (!result.ok) {
      if (result.message) setToast(result.message);
      return;
    }

    pushToHistory(result.subtitles);
    setCurrentTime(result.startTime);
    setToast(result.message);
  }

  function changeWordsPerLine(value) {
    setWordsPerLine(value);
    const result = regroupSubtitlesByWordsPerLine(subtitles, value, createId);
    if (result.ok) {
      pushToHistory(result.subtitles);
      setToast(`จัดคำบรรยายใหม่เป็น ${value} คำ/บรรทัด เรียบร้อย`);
    }
  }

  function addWord(afterWordId) {
    const result = addSubtitleWord(subtitles, afterWordId, createId);
    if (!result.ok) return;
    pushToHistory(result.subtitles);
    setCurrentTime(result.startTime);
    setToast('เพิ่มเวิร์ดเรียบร้อย');
  }

  return (
    <div className="app-shell">
      {!project ? (
        <Landing 
          projects={projects} 
          onProject={openProject} 
          onUpload={uploadVideo} 
          onRefreshProjects={refreshProjects}
          isLoading={isLoading}
          setToast={setToast}
          uploadProgress={uploadProgress}
        />
      ) : (
        <EditorProvider
          value={{
            project,
            projects,
            subtitles,
            activeWord,
            activeSegment,
            segmentCount: (subtitles?.segments || []).length,
            activeTool,
            previewWords,
            allWords,
            currentTime,
            duration,
            style,
            renderOptions,
            whisperSettings,
            whisperStatus,
            videoRef,
            wordsPerLine,
            isDirty,
            audioSettings,
            undo,
            redo,
            canUndo,
            canRedo,
            saveStatus,
            isLoading,
            onBack: () => setProject(null),
            onProject: openProject,
            onUpload: uploadVideo,
            onTranscribe: transcribe,
            onSave: () => saveSubtitles(),
            onAutocorrect: autocorrect,
            onRepairThai: repairThaiWords,
            onRender: renderVideo,
            onRenderOptions: setRenderOptions,
            onSubtitleExport: exportSubtitles,
            onTool: setActiveTool,
            onStyle: setStyle,
            onWhisperSettings: setWhisperSettings,
            onTime: setCurrentTime,
            onDurationChange: setVideoDuration,
            onWordChange: updateWord,
            onRowTextChange: updateRowText,
            onDeleteWord: deleteWord,
            onDeleteRow: deleteRow,
            onAddSegment: addSegment,
            onMergeSegments: mergeSegments,
            onAddWord: addWord,
            onMergeWords: mergeWords,
            onSplitSegment: splitSegmentAtWord,
            onWordsPerLine: changeWordsPerLine,
            onAudioSettings: setAudioSettings,
            onSubtitles: pushToHistory,
            isInspectorCollapsed,
            onInspectorCollapse: setIsInspectorCollapsed,
            activeJob,
            onCancelJob: cancelActiveJob,
            setToast,
          }}
        >
          <Editor />
        </EditorProvider>
      )}
      <Toast message={toast.message} type={toast.type} onClose={() => setToast('')} />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
