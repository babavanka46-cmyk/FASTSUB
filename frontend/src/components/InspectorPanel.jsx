import React, { useState } from 'react';
import { Download, Layers, Music2, PanelRight, Plus, Sparkles, TextCursorInput, Upload } from 'lucide-react';
import { apiRequest } from '../api';

const tools = [
  { id: 'styles', label: 'สไตล์', icon: Sparkles },
  { id: 'typography', label: 'ตัวอักษร', icon: TextCursorInput },
  { id: 'bgm', label: 'เพลง', icon: Music2 },
  { id: 'export', label: 'ส่งออก', icon: Download },
  { id: 'layers', label: 'เลเยอร์', icon: Layers },
];

const PRESET_STYLES = {
  creator: {
    text_color: '#f4c64f',
    active_color: '#ffffff',
    shadow_color: '#050505',
    font_weight: 900,
    animation: 'pop',
  },
  neon: {
    text_color: '#7df9ff',
    active_color: '#ffffff',
    shadow_color: '#02b7ff',
    font_weight: 800,
    animation: 'pop',
  },
  minimal: {
    text_color: '#ffffff',
    active_color: '#f4c64f',
    shadow_color: '#000000',
    font_weight: 700,
    animation: 'fade',
  },
  boxed: {
    text_color: '#ffffff',
    active_color: '#ffd16b',
    shadow_color: '#000000',
    font_weight: 800,
    animation: 'fade',
  },
};

export function InspectorPanel({
  project,
  activeTool,
  onTool,
  style,
  onStyle,
  renderOptions,
  onRenderOptions,
  onRender,
  onSubtitleExport,
  audioSettings,
  onAudioSettings,
  onSubtitles,
  setToast,
  isLoading,
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isUploadingBgm, setIsUploadingBgm] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('English');
  const isLoadingRender = isLoading?.render || false;
  const isLoadingExport = isLoading?.export || false;
  const exportBusy = isLoadingRender || isLoadingExport;

  const updateRenderOptions = (patch) => onRenderOptions((current) => ({ ...current, ...patch }));
  const updateAudioSettings = (patch) => onAudioSettings((current) => ({ ...current, ...patch }));

  const handleBgmUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      setIsUploadingBgm(true);
      setToast('กำลังอัปโหลดเพลงประกอบ...');
      const response = await apiRequest(`/api/project/${project.id}/assets/bgm`, {
        method: 'POST',
        body: formData,
      });
      updateAudioSettings({ bgm_path: response.path });
      setToast(`อัปโหลดเพลงสำเร็จ: ${file.name}`);
    } catch (err) {
      setToast(`อัปโหลดเพลงไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsUploadingBgm(false);
      event.target.value = '';
    }
  };

  const handleTranslate = async () => {
    setToast({ type: 'error', message: 'ฟีเจอร์แปลภาษายังไม่พร้อมใช้งานจริง' });
  };

  return (
    <aside className={`inspector ${isCollapsed ? 'collapsed' : ''}`}>
      {!isCollapsed && (
        <div className="inspector-body">
          {activeTool === 'styles' && (
            <ControlGroup title="สไตล์ซับ">
              {['creator', 'neon', 'minimal', 'boxed'].map((preset) => (
                <button
                  key={preset}
                  className={`preset-button ${style.preset === preset ? 'active' : ''}`}
                  onClick={() => onStyle({ ...style, preset, ...PRESET_STYLES[preset] })}
                >
                  {preset}
                </button>
              ))}
            </ControlGroup>
          )}

          {activeTool === 'typography' && (
            <ControlGroup title="ตัวอักษร">
              <Labeled label="แบบอักษร">
                <select value={style.font_family} onChange={(event) => onStyle({ ...style, font_family: event.target.value })}>
                  <option value="Noto Sans Thai">Noto Sans Thai</option>
                  <option value="Arial">Arial</option>
                  <option value="Prompt">Prompt</option>
                  <option value="Kanit">Kanit</option>
                  <option value="Sarabun">Sarabun</option>
                </select>
              </Labeled>
              <Labeled label="ขนาด"><input type="range" min="24" max="72" value={style.font_size} onChange={(event) => onStyle({ ...style, font_size: Number(event.target.value) })} /></Labeled>
              <Labeled label="น้ำหนัก"><input type="range" min="400" max="900" step="100" value={style.font_weight} onChange={(event) => onStyle({ ...style, font_weight: Number(event.target.value) })} /></Labeled>
              <Labeled label="ตำแหน่ง"><input type="range" min="8" max="90" value={style.vertical_offset} onChange={(event) => onStyle({ ...style, vertical_offset: Number(event.target.value) })} /></Labeled>
              <Labeled label="สีหลัก"><input type="color" value={style.text_color} onChange={(event) => onStyle({ ...style, text_color: event.target.value })} /></Labeled>
              <Labeled label="สีไฮไลต์"><input type="color" value={style.active_color} onChange={(event) => onStyle({ ...style, active_color: event.target.value })} /></Labeled>
              <Labeled label="อนิเมชันตัวอักษร">
                <select value={style.animation} onChange={(event) => onStyle({ ...style, animation: event.target.value })}>
                  <option value="pop">ขยายตัวพรีเมียม (Pop)</option>
                  <option value="fade">เลือนหายธรรมชาติ (Fade)</option>
                  <option value="bounce">กระดอนดิ้นได้ (Bounce)</option>
                  <option value="bounceIn">กระดอนเข้าฉาก (Bounce In)</option>
                  <option value="fadeIn">เลือนปรากฏ (Fade In)</option>
                  <option value="fadeInUp">เลือนพุ่งขึ้นด้านบน (Fade In Up)</option>
                  <option value="zoomIn">ซูมขยายใหญ่ (Zoom In)</option>
                  <option value="flip">พลิกหมุนตัวอักษร (Flip)</option>
                  <option value="pulse">เต้นเป็นจังหวะชีพจร (Pulse)</option>
                  <option value="rubberBand">ยางยืดหยุ่น (Rubber Band)</option>
                  <option value="tada">แต๊นแตนเอฟเฟกต์ (Tada)</option>
                  <option value="slideInUp">เลื่อนพุ่งเข้าด้านบน (Slide In Up)</option>
                </select>
              </Labeled>
            </ControlGroup>
          )}

          {activeTool === 'translation' && (
            <ControlGroup title="แปลภาษา">
              <Labeled label="ภาษาเป้าหมาย">
                <select value={targetLanguage} onChange={(event) => setTargetLanguage(event.target.value)}>
                  <option value="English">English</option>
                  <option value="Japanese">Japanese</option>
                  <option value="Korean">Korean</option>
                  <option value="Chinese">Chinese</option>
                </select>
              </Labeled>
              <button className="button accent full" onClick={handleTranslate} disabled title="ฟีเจอร์แปลภาษายังไม่พร้อมใช้งานจริง">แปลซับ (เร็วๆ นี้)</button>
            </ControlGroup>
          )}

          {activeTool === 'bgm' && (
            <ControlGroup title="เพลงประกอบ">
              <div style={{ marginBottom: '12px', fontSize: '12px' }}>
                {audioSettings.bgm_path ? (
                  <span style={{ color: '#f4c64f' }}>โหลดเพลง: ...{audioSettings.bgm_path.split('/').pop()}</span>
                ) : (
                  <span style={{ color: '#8d8d8d' }}>ยังไม่ได้เลือกเพลงประกอบ</span>
                )}
              </div>
              <Labeled label="อัปโหลดเพลง">
                <label className="button ghost" style={{ cursor: 'pointer', display: 'flex', gap: '4px' }}>
                  <Upload size={14} /> เลือกไฟล์เสียง
                  <input type="file" accept="audio/*" onChange={handleBgmUpload} disabled={isUploadingBgm} />
                </label>
              </Labeled>
              <Labeled label="ระดับเสียง">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={audioSettings.bgm_volume}
                  onChange={(event) => updateAudioSettings({ bgm_volume: Number(event.target.value) })}
                />
              </Labeled>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={audioSettings.bgm_loop}
                  onChange={(event) => updateAudioSettings({ bgm_loop: event.target.checked })}
                />{' '}
                วนเพลง
              </label>
            </ControlGroup>
          )}

          {activeTool === 'sfx' && (
            <ControlGroup title="เสียงเอฟเฟกต์">
              <div style={{ color: '#ffadad', fontSize: '12px', marginBottom: '10px', padding: '6px', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.05)' }}>
                ⚠️ ฟีเจอร์นี้อยู่ระหว่างการพัฒนา (Under Development)
              </div>
              <Labeled label="เอฟเฟกต์">
                <select disabled><option>Woosh</option><option>Mouse click</option><option>Tap</option></select>
              </Labeled>
              <Labeled label="ความถี่"><input type="range" min="0" max="1" step="0.01" defaultValue="0.2" disabled /></Labeled>
              <Labeled label="ระดับเสียง"><input type="range" min="0" max="1" step="0.01" defaultValue="0.35" disabled /></Labeled>
            </ControlGroup>
          )}

          {activeTool === 'export' && (
            <ControlGroup title="ส่งออก">
              <Labeled label="ประเภทซับไตเติล">
                <select value={renderOptions.subtitleType} onChange={(event) => updateRenderOptions({ subtitleType: event.target.value })} disabled={exportBusy}>
                  <option value="hard">ฝังซับในวิดีโอ (Hard Subtitle)</option>
                  <option value="soft">แยกแทร็กซับไตเติล (Soft Subtitle)</option>
                </select>
              </Labeled>
              <Labeled label="ความละเอียด (Resolution)">
                <select value={renderOptions.resolution} onChange={(event) => updateRenderOptions({ resolution: event.target.value })} disabled={exportBusy}>
                  <option>1080p</option>
                  <option>720p</option>
                  <option>1440p</option>
                </select>
              </Labeled>
              <Labeled label="อัตราเฟรมเรต (FPS)">
                <select value={renderOptions.fps} onChange={(event) => updateRenderOptions({ fps: Number(event.target.value) })} disabled={exportBusy}>
                  <option value="30">30</option>
                  <option value="24">24</option>
                  <option value="60">60</option>
                </select>
              </Labeled>
              
              <div style={{ margin: '14px 0 6px', fontSize: '13px', color: '#8d8d8d' }}>ส่งออกไฟล์ซับ:</div>
              <div className="export-grid">
                <button className="button ghost" onClick={() => onSubtitleExport('srt')} disabled={exportBusy}>SRT</button>
                <button className="button ghost" onClick={() => onSubtitleExport('vtt')} disabled={exportBusy}>VTT</button>
                <button className="button ghost" onClick={() => onSubtitleExport('ass')} disabled={exportBusy}>ASS</button>
                <button className="button ghost" onClick={() => onSubtitleExport('txt')} disabled={exportBusy}>TXT</button>
              </div>
              {isLoadingExport && <div className="hint-text">กำลังส่งออกไฟล์ซับ...</div>}
              
              <button className="button accent full" onClick={onRender} style={{ marginTop: '16px' }} disabled={exportBusy}>
                {isLoadingRender ? 'กำลังเรนเดอร์...' : 'เรนเดอร์วิดีโอ'}
              </button>
            </ControlGroup>
          )}

          {activeTool === 'layers' && (
            <ControlGroup title="เลเยอร์">
              <div style={{ color: '#8d8d8d', fontSize: '13px', padding: '10px 0' }}>
                เลเยอร์ซับ: <strong>Main Layer ({style.font_family})</strong>
              </div>
            </ControlGroup>
          )}
        </div>
      )}

      <div className="tool-rail">
        <button className="icon-button soft" onClick={() => setIsCollapsed(!isCollapsed)} title={isCollapsed ? 'ขยายแถบเครื่องมือ' : 'ย่อแถบเครื่องมือ'}>
          <PanelRight size={16} />
        </button>
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              className={`rail-button ${activeTool === tool.id ? 'active' : ''}`}
              onClick={() => {
                onTool(tool.id);
                setIsCollapsed(false);
              }}
              title={tool.label}
            >
              <Icon size={17} />
            </button>
          );
        })}
        <button className="rail-button" disabled title="เพิ่มปลั๊กอิน (ยังไม่เปิดใช้งาน)"><Plus size={17} /></button>
      </div>
    </aside>
  );
}

function ControlGroup({ title, children }) {
  return <div className="control-group"><h2>{title}</h2>{children}</div>;
}

function Labeled({ label, children }) {
  return <label className="control-row"><span>{label}</span>{children}</label>;
}
