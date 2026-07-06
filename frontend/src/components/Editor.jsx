import React, { useEffect } from 'react';
import { ChevronLeft, Save, Upload, Wand2 } from 'lucide-react';
import { TranscriptPanel } from './TranscriptPanel';
import { PreviewPanel } from './PreviewPanel';
import { CaptionStyleInspector } from './CaptionStyleInspector';
import { TimelinePanel } from './TimelinePanel';
import { FloatingAnimationPanel } from './animation/FloatingAnimationPanel';
import { useEditor } from '../context/EditorContext';

export function Editor() {
  const {
    project,
    subtitles,
    activeWord,
    activeTool,
    allWords,
    currentTime,
    videoRef,
    isDirty,
    undo,
    redo,
    onSave,
    onDeleteWord,
  } = useEditor();

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
      <StudioTopbar />
      <section className="studio-workspace">
        <TranscriptPanel />
        <PreviewPanel />
        <FloatingAnimationPanel />
        <CaptionStyleInspector />
      </section>
      <TimelinePanel />
    </main>
  );
}

function StudioTopbar() {
  const {
    project,
    projects,
    whisperSettings,
    whisperStatus,
    saveStatus,
    isLoading,
    onBack,
    onProject,
    onUpload,
    onTranscribe,
    onWhisperSettings,
    onSave,
    onRender,
    onSubtitleExport,
  } = useEditor();

  const loadedModels = whisperStatus?.loaded_models?.map((item) => Array.isArray(item) ? item.join('/') : String(item)).join(', ');
  const statusText = whisperStatus?.installed
    ? `Whisper พร้อม: ${loadedModels || `${whisperSettings.model}/${whisperSettings.device}/${whisperSettings.computeType}`}`
    : 'Whisper ยังไม่พร้อม';
  
  const updateWhisper = (patch) => onWhisperSettings((current) => ({ ...current, ...patch }));

  const isLoadingTranscribe = isLoading?.transcribe || false;
  const isLoadingRender = isLoading?.render || false;
  const isLoadingUpload = isLoading?.upload || false;
  const anyLoading = isLoadingTranscribe || isLoadingRender || isLoadingUpload;

  return (
    <header className="studio-topbar">
      <div className="top-left">
        <button className="icon-button soft" onClick={onBack} title="กลับ" disabled={anyLoading}><ChevronLeft size={17} /></button>
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
        <span style={{ fontSize: '12px', color: '#8d8d8d', marginLeft: '6px' }}>ภาษา:</span>
        <select 
          value={whisperSettings.language} 
          onChange={(event) => updateWhisper({ language: event.target.value })}
          disabled={anyLoading}
        >
          <option value="th">ไทย</option>
          <option value="en">English</option>
          <option value="">Auto</option>
        </select>
        
        <span style={{ fontSize: '12px', color: '#8d8d8d' }}>โมเดล AI:</span>
        <select 
          value={whisperSettings.model} 
          onChange={(event) => updateWhisper({ model: event.target.value })}
          disabled={anyLoading}
        >
          <option value="tiny">tiny</option>
          <option value="base">base</option>
          <option value="small">small</option>
          <option value="medium">medium</option>
        </select>
        
        <select 
          value={whisperSettings.device} 
          onChange={(event) => {
            const device = event.target.value;
            updateWhisper({ device, computeType: device === 'cuda' ? 'float16' : 'int8' });
          }}
          disabled={anyLoading}
        >
          <option value="cpu">CPU</option>
          <option value="cuda">GPU CUDA</option>
        </select>
        
        <select 
          value={whisperSettings.computeType} 
          onChange={(event) => updateWhisper({ computeType: event.target.value })}
          disabled={anyLoading}
        >
          <option value="int8">int8</option>
          <option value="float16">float16</option>
          <option value="float32">float32</option>
        </select>
        
        <label className="check-row" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}>
          <input 
            type="checkbox" 
            checked={whisperSettings.vadFilter} 
            onChange={(event) => updateWhisper({ vadFilter: event.target.checked })} 
            disabled={anyLoading}
          />
          VAD
        </label>
        
        <button 
          className="button accent" 
          onClick={onTranscribe}
          disabled={isLoadingTranscribe || anyLoading}
        >
          <Wand2 size={16} /> {isLoadingTranscribe ? 'กำลังถอดเสียง...' : 'ถอดเสียง AI'}
        </button>
        <span className="gpu-note">{statusText}</span>
      </div>
      <div className="top-actions">
        <select 
          value={project.id} 
          onChange={(event) => onProject(event.target.value)}
          disabled={anyLoading}
        >
          {projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <label className="button ghost" style={{ opacity: isLoadingUpload ? 0.6 : 1, pointerEvents: isLoadingUpload ? 'none' : 'auto' }}>
          <Upload size={16} /> นำเข้า
          <input type="file" accept="video/*" onChange={onUpload} disabled={isLoadingUpload || anyLoading} />
        </label>
        <button className="button ghost" onClick={onSave} disabled={anyLoading}><Save size={16} /> บันทึก</button>
        
        {/* Subtitle Export Dropdown */}
        <select 
          onChange={(e) => {
            if (e.target.value) {
              onSubtitleExport(e.target.value);
              e.target.value = ""; // Reset
            }
          }}
          defaultValue=""
          style={{ 
            height: '34px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '6px',
            color: '#dfdfdf',
            padding: '0 8px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            outline: 'none',
          }}
          disabled={anyLoading}
        >
          <option value="" disabled>ส่งออกซับ 📥</option>
          <option value="srt">SRT Format (.srt)</option>
          <option value="vtt">VTT Format (.vtt)</option>
          <option value="ass">ASS Format (.ass)</option>
          <option value="txt">TXT Text Only (.txt)</option>
        </select>

        <button className="button accent" onClick={onRender} disabled={isLoadingRender || anyLoading}>
          {isLoadingRender ? 'กำลังเรนเดอร์...' : 'เรนเดอร์'}
        </button>
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
