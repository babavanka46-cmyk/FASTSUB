import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { API, apiRequest } from './api';
import { getActivePreviewWords } from './subtitleUtils';
import { Landing } from './components/Landing';
import { Editor } from './components/Editor';
import './styles.css';

const defaultStyle = {
  preset: 'creator',
  animation: 'pop',
  font_family: 'Noto Sans Thai',
  font_size: 42,
  font_weight: 900,
  vertical_offset: 25,
  text_color: '#f4c64f',
  active_color: '#ffffff',
  shadow_color: '#050505',
};

function App() {
  const [project, setProject] = useState(null);
  const [projects, setProjects] = useState([]);
  const [subtitles, setSubtitles] = useState(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [style, setStyle] = useState(defaultStyle);
  const [activeTool, setActiveTool] = useState('styles');
  const [wordsPerLine, setWordsPerLine] = useState(3);
  const [whisperStatus, setWhisperStatus] = useState(null);
  const [whisperSettings, setWhisperSettings] = useState({
    language: 'th',
    model: 'small',
    device: 'cpu',
    computeType: 'int8',
    vadFilter: false,
  });
  const [audioSettings, setAudioSettings] = useState({
    bgm_path: null,
    bgm_volume: 0.18,
    bgm_loop: true,
    sfx_name: null,
    sfx_density: 0.2,
    sfx_volume: 0.35,
  });
  const [renderOptions, setRenderOptions] = useState({ subtitleType: 'hard', resolution: '1080p', fps: 30 });
  const [toast, setToast] = useState('');
  const [isDirty, setIsDirty] = useState(false);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saved', 'dirty', 'saving', 'error'
  const videoRef = useRef(null);

  const refreshProjects = () => {
    fetch(`${API}/api/projects`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setProjects(data);
      })
      .catch(() => setProjects([]));
  };

  useEffect(() => {
    refreshProjects();
    apiRequest('/api/whisper/status').then(setWhisperStatus).catch(() => setWhisperStatus(null));
  }, []);

  useEffect(() => {
    if (!project) return;
    fetch(`${API}/api/project/${project.id}/subtitles`)
      .then((r) => r.json())
      .then((data) => {
        setSubtitles(data);
        setWordsPerLine(data.words_per_line || 3);
        setPast([]);
        setFuture([]);
        setIsDirty(false);
        setSaveStatus('saved');
      });
  }, [project]);

  const allWords = useMemo(() => {
    return (subtitles?.segments || []).flatMap((segment) => segment.words || []);
  }, [subtitles]);

  const duration = useMemo(() => {
    return Math.max(22, ...allWords.map((word) => word.end || 0), ...((subtitles?.segments || []).map((segment) => segment.end || 0)));
  }, [allWords, subtitles]);

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
    return getActivePreviewWords(activeSegment, currentTime, wordsPerLine);
  }, [activeSegment, currentTime, wordsPerLine]);

  // Debounced Autosave Effect
  useEffect(() => {
    if (!project || !subtitles || !isDirty) return;

    setSaveStatus('dirty');

    const timer = setTimeout(async () => {
      try {
        setSaveStatus('saving');
        const payload = { ...subtitles, words_per_line: wordsPerLine };
        await apiRequest(`/api/project/${project.id}/subtitles`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        setIsDirty(false);
        setSaveStatus('saved');
      } catch (err) {
        setSaveStatus('error');
        setToast(`บันทึกอัตโนมัติล้มเหลว: ${err.message}`);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [subtitles, isDirty, wordsPerLine, project]);

  const pushToHistory = (nextSubtitles) => {
    setPast((prevPast) => {
      const newPast = [...prevPast, subtitles];
      if (newPast.length > 50) {
        newPast.shift();
      }
      return newPast;
    });
    setFuture([]);
    setSubtitles(nextSubtitles);
    setIsDirty(true);
    setSaveStatus('dirty');
  };

  const undo = () => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    
    setPast(newPast);
    setFuture((prevFuture) => [subtitles, ...prevFuture]);
    setSubtitles(previous);
    setIsDirty(true);
    setSaveStatus('dirty');
  };

  const redo = () => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    
    setPast((prevPast) => [...prevPast, subtitles]);
    setFuture(newFuture);
    setSubtitles(next);
    setIsDirty(true);
    setSaveStatus('dirty');
  };

  async function uploadVideo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try {
      setToast('กำลังอัปโหลด...');
      const created = await apiRequest('/api/projects/upload', { method: 'POST', body: form });
      setProject(created);
      setProjects((items) => [created, ...items]);
      setToast('อัปโหลดวิดีโอแล้ว');
    } catch (error) {
      setToast(`อัปโหลดไม่สำเร็จ: ${error.message}`);
    } finally {
      event.target.value = '';
    }
  }

  async function transcribe() {
    if (!project) return;
    try {
      setToast('กำลังถอดเสียง...');
      const params = new URLSearchParams({
        language: whisperSettings.language,
        model: whisperSettings.model,
        device: whisperSettings.device,
        compute_type: whisperSettings.computeType,
        vad_filter: String(whisperSettings.vadFilter),
      });
      const data = await apiRequest(`/api/project/${project.id}/transcribe?${params.toString()}`, { method: 'POST' });
      setSubtitles(data);
      const status = await apiRequest('/api/whisper/status');
      setWhisperStatus(status);
      setPast([]);
      setFuture([]);
      setIsDirty(false);
      setSaveStatus('saved');
      setToast('ถอดเสียงเรียบร้อย');
    } catch (error) {
      setToast(`ถอดเสียงไม่สำเร็จ: ${error.message}`);
    }
  }

  async function saveSubtitles(next = subtitles) {
    if (!project || !next) return;
    const payload = { ...next, words_per_line: wordsPerLine };
    try {
      setSaveStatus('saving');
      const data = await apiRequest(`/api/project/${project.id}/subtitles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      setSubtitles(data);
      setIsDirty(false);
      setSaveStatus('saved');
      setToast('บันทึกแล้ว');
    } catch (error) {
      setSaveStatus('error');
      setToast(`บันทึกไม่สำเร็จ: ${error.message}`);
    }
  }

  async function autocorrect(provider = 'local', geminiApiKey = '') {
    if (!project || !subtitles) return;
    try {
      setToast('กำลังตรวจคำ...');
      const payload = { provider };
      if (provider === 'gemini' && geminiApiKey) {
        payload.api_key = geminiApiKey;
      }
      const data = await apiRequest(`/api/project/${project.id}/autocorrect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      pushToHistory(data);
      setToast('ตรวจคำเรียบร้อย');
    } catch (error) {
      setToast(`ตรวจคำไม่สำเร็จ: ${error.message}`);
    }
  }

  async function renderVideo() {
    if (!project) return;
    try {
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
    }
  }

  async function exportSubtitles(format) {
    if (!project) return;
    try {
      const result = await apiRequest(`/api/project/${project.id}/subtitles/export?output_format=${format}`, { method: 'POST' });
      setToast(result.message);
      window.open(`${API}${result.output_url}`, '_blank');
    } catch (error) {
      setToast(`ส่งออกซับไม่สำเร็จ: ${error.message}`);
    }
  }

  function updateWord(segmentId, wordId, text) {
    if (!subtitles) return;
    const next = structuredClone(subtitles);
    const segment = next.segments.find((item) => item.id === segmentId);
    const word = segment?.words.find((item) => item.id === wordId);
    if (!segment || !word) return;
    word.text = text;
    segment.text = segment.words.map((item) => item.text).join(' ');
    pushToHistory(next);
  }

  function deleteWord(segmentId, wordId) {
    if (!subtitles) return;
    const next = structuredClone(subtitles);
    const segment = next.segments.find((item) => item.id === segmentId);
    if (!segment) return;
    segment.words = segment.words.filter((item) => item.id !== wordId);
    segment.text = segment.words.map((item) => item.text).join(' ');
    pushToHistory(next);
  }

  function openProject(id) {
    const selected = projects.find((item) => item.id === id);
    setProject(selected || null);
    if (selected && selected.settings?.audio) {
      setAudioSettings((prev) => ({ ...prev, ...selected.settings.audio }));
    }
  }

  return (
    <div className="app-shell">
      {!project ? (
        <Landing 
          projects={projects} 
          onProject={openProject} 
          onUpload={uploadVideo} 
          onRefreshProjects={refreshProjects}
        />
      ) : (
        <Editor
          project={project}
          projects={projects}
          subtitles={subtitles}
          activeWord={activeWord}
          activeSegment={activeSegment}
          activeTool={activeTool}
          previewWords={previewWords}
          allWords={allWords}
          currentTime={currentTime}
          duration={duration}
          style={style}
          renderOptions={renderOptions}
          whisperSettings={whisperSettings}
          whisperStatus={whisperStatus}
          videoRef={videoRef}
          wordsPerLine={wordsPerLine}
          isDirty={isDirty}
          audioSettings={audioSettings}
          undo={undo}
          redo={redo}
          canUndo={past.length > 0}
          canRedo={future.length > 0}
          saveStatus={saveStatus}
          onBack={() => setProject(null)}
          onProject={openProject}
          onUpload={uploadVideo}
          onTranscribe={transcribe}
          onSave={() => saveSubtitles()}
          onAutocorrect={autocorrect}
          onRender={renderVideo}
          onRenderOptions={setRenderOptions}
          onSubtitleExport={exportSubtitles}
          onTool={setActiveTool}
          onStyle={setStyle}
          onWhisperSettings={setWhisperSettings}
          onTime={setCurrentTime}
          onWordChange={updateWord}
          onDeleteWord={deleteWord}
          onWordsPerLine={(val) => {
            setWordsPerLine(val);
            if (subtitles) {
              const next = { ...subtitles, words_per_line: val };
              pushToHistory(next);
            }
          }}
          onAudioSettings={setAudioSettings}
          onSubtitles={(data) => {
            pushToHistory(data);
          }}
          setToast={setToast}
        />
      )}
      {toast && <button className="toast" onClick={() => setToast('')}>{toast}</button>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
