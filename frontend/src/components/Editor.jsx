import React, { useEffect } from 'react';
import { ChevronLeft, Save, Upload, Wand2 } from 'lucide-react';
import { TranscriptPanel } from './TranscriptPanel';
import { PreviewPanel } from './PreviewPanel';
import { InspectorPanel } from './InspectorPanel';
import { TimelinePanel } from './TimelinePanel';

export function Editor(props) {
  const {
    project,
    projects,
    subtitles,
    activeWord,
    activeSegment,
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
    onBack,
    onProject,
    onUpload,
    onTranscribe,
    onSave,
    onAutocorrect,
    onRender,
    onRenderOptions,
    onSubtitleExport,
    onTool,
    onStyle,
    onWhisperSettings,
    onTime,
    onWordChange,
    onWordsPerLine,
    onDeleteWord,
    onSubtitles,
    onAudioSettings,
    setToast,
  } = props;

  // Keyboard shortcuts listener
  useEffect(() => {
    const handleKeyDown = (event) => {
      const activeEl = document.activeElement;
      const isInput = activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT');

      if (event.ctrlKey && event.key.toLowerCase() === 's') {
        event.preventDefault();
        onSave();
      } else if (event.ctrlKey && event.key.toLowerCase() === 'z' && !isInput) {
        event.preventDefault();
        undo();
      } else if (event.ctrlKey && event.key.toLowerCase() === 'y' && !isInput) {
        event.preventDefault();
        redo();
      } else if (event.key === ' ' && !isInput) {
        event.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play();
          } else {
            videoRef.current.pause();
          }
        }
      } else if ((event.key === 'Delete' || event.key === 'Backspace') && !isInput && activeWord) {
        event.preventDefault();
        const segment = subtitles?.segments.find(s => s.words.some(w => w.id === activeWord));
        if (segment) {
          onDeleteWord(segment.id, activeWord);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeWord, subtitles, videoRef, onSave, onDeleteWord, undo, redo]);

  // Warn user on close if dirty
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (isDirty) {
        event.preventDefault();
        event.returnValue = 'คุณมีงานที่ยังไม่ได้บันทึก แน่ใจหรือไม่ว่าต้องการออกจากหน้านี้?';
        return event.returnValue;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isDirty]);

  return (
    <main className="studio">
      <StudioTopbar 
        project={project}
        projects={projects}
        whisperSettings={whisperSettings}
        whisperStatus={whisperStatus}
        saveStatus={saveStatus}
        onBack={onBack}
        onProject={onProject}
        onUpload={onUpload}
        onTranscribe={onTranscribe}
        onWhisperSettings={onWhisperSettings}
        onSave={onSave}
        onRender={onRender}
      />
      <section className="studio-workspace">
        <TranscriptPanel 
          subtitles={subtitles}
          activeWord={activeWord}
          wordsPerLine={wordsPerLine}
          onWordsPerLine={onWordsPerLine}
          onWordChange={onWordChange}
          onDeleteWord={onDeleteWord}
          onAutocorrect={onAutocorrect}
        />
        <PreviewPanel 
          project={project}
          previewWords={previewWords}
          activeWord={activeWord}
          style={style}
          videoRef={videoRef}
          onTime={onTime}
          currentTime={currentTime}
          duration={duration}
        />
        <InspectorPanel 
          project={project}
          activeTool={activeTool}
          onTool={onTool}
          style={style}
          onStyle={onStyle}
          renderOptions={renderOptions}
          onRenderOptions={onRenderOptions}
          onRender={onRender}
          onSubtitleExport={onSubtitleExport}
          audioSettings={audioSettings}
          onAudioSettings={onAudioSettings}
          onSubtitles={onSubtitles}
          setToast={setToast}
        />
      </section>
      <TimelinePanel 
        allWords={allWords}
        currentTime={currentTime}
        duration={duration}
        videoRef={videoRef}
        onTime={onTime}
      />
    </main>
  );
}

function StudioTopbar({ 
  project, 
  projects, 
  whisperSettings, 
  whisperStatus, 
  saveStatus,
  onBack, 
  onProject, 
  onUpload, 
  onTranscribe, 
  onWhisperSettings, 
  onSave, 
  onRender 
}) {
  const loadedModels = whisperStatus?.loaded_models?.map((item) => Array.isArray(item) ? item.join('/') : String(item)).join(', ');
  const statusText = whisperStatus?.installed
    ? `Whisper พร้อม: ${loadedModels || `${whisperSettings.model}/${whisperSettings.device}/${whisperSettings.computeType}`}`
    : 'Whisper ยังไม่พร้อม';
  
  const updateWhisper = (patch) => onWhisperSettings((current) => ({ ...current, ...patch }));

  return (
    <header className="studio-topbar">
      <div className="top-left">
        <button className="icon-button soft" onClick={onBack} title="กลับ"><ChevronLeft size={17} /></button>
        <Brand compact />
        <div className="project-title">
          <strong>{project.name || 'โปรเจกต์ใหม่'}</strong>
          {saveStatus === 'saved' && (
            <span style={{ color: '#10b981', fontSize: '11px', transition: 'color 0.3s' }}>บันทึกข้อมูลเรียบร้อยแล้ว</span>
          )}
          {saveStatus === 'dirty' && (
            <span style={{ color: '#f59e0b', fontSize: '11px', transition: 'color 0.3s' }}>มีส่วนที่ยังไม่ได้บันทึก (รอเซฟอัตโนมัติ...)</span>
          )}
          {saveStatus === 'saving' && (
            <span style={{ color: '#60a5fa', fontSize: '11px', animation: 'pulse 1.5s infinite' }}>กำลังบันทึกอัตโนมัติ...</span>
          )}
          {saveStatus === 'error' && (
            <span style={{ color: '#ef4444', fontSize: '11px', transition: 'color 0.3s' }}>บันทึกล้มเหลว ⚠️</span>
          )}
        </div>
      </div>
      <div className="top-middle">
        <button className="chip" disabled title="เพจหลัก (ยังไม่เปิดใช้งาน)">เพจหลัก</button>
        <button className="chip" disabled title="FASTSUB Local (ยังไม่เปิดใช้งาน)">FASTSUB Local</button>
        <button className="chip" disabled title="วิธีใช้งาน (ยังไม่เปิดใช้งาน)">วิธีใช้งาน</button>
        
        <span style={{ fontSize: '12px', color: '#8d8d8d', marginLeft: '6px' }}>ภาษา:</span>
        <select value={whisperSettings.language} onChange={(event) => updateWhisper({ language: event.target.value })}>
          <option value="th">ไทย</option>
          <option value="en">English</option>
          <option value="">Auto</option>
        </select>
        
        <span style={{ fontSize: '12px', color: '#8d8d8d' }}>โมเดล AI:</span>
        <select value={whisperSettings.model} onChange={(event) => updateWhisper({ model: event.target.value })}>
          <option value="tiny">tiny</option>
          <option value="base">base</option>
          <option value="small">small</option>
          <option value="medium">medium</option>
        </select>
        
        <select value={whisperSettings.device} onChange={(event) => {
          const device = event.target.value;
          updateWhisper({ device, computeType: device === 'cuda' ? 'float16' : 'int8' });
        }}>
          <option value="cpu">CPU</option>
          <option value="cuda">GPU CUDA</option>
        </select>
        
        <select value={whisperSettings.computeType} onChange={(event) => updateWhisper({ computeType: event.target.value })}>
          <option value="int8">int8</option>
          <option value="float16">float16</option>
          <option value="float32">float32</option>
        </select>
        
        <label className="check-row" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={whisperSettings.vadFilter} 
            onChange={(event) => updateWhisper({ vadFilter: event.target.checked })} 
          />
          VAD
        </label>
        
        <button className="button accent" onClick={onTranscribe}><Wand2 size={16} /> ถอดเสียง AI</button>
        <span className="gpu-note">{statusText}</span>
      </div>
      <div className="top-actions">
        <select value={project.id} onChange={(event) => onProject(event.target.value)}>
          {projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <label className="button ghost"><Upload size={16} /> นำเข้า<input type="file" accept="video/*" onChange={onUpload} /></label>
        <button className="button ghost" onClick={onSave}><Save size={16} /> บันทึก</button>
        <button className="button accent" onClick={onRender}>เรนเดอร์</button>
      </div>
    </header>
  );
}

function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? 'compact' : ''}`}>
      <div className="fs-mark"><span>FS</span></div>
      <div>
        <strong>FASTSUB</strong>
        {!compact && <span>ทำซับ • ซาวด์เอฟเฟกต์ • เพลงประกอบ อัตโนมัติ</span>}
      </div>
    </div>
  );
}
