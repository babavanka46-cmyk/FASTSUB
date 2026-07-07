import React, { useState } from 'react';
import { Download, Layers, Music2, PanelRight, Sparkles, Sliders } from 'lucide-react';
import { CaptionPresetGrid } from './CaptionPresetGrid';
import { captionPresets } from '../presets/captionPresets';
import { useEditor } from '../context/EditorContext';

export function CaptionStyleInspector() {
  const {
    activeTool,
    onTool,
    style,
    onStyle,
    wordsPerLine,
    onWordsPerLine,
    renderOptions,
    onRenderOptions,
    onRender,
    onSubtitleExport,
    audioSettings,
    onAudioSettings,
    isLoading,
    isInspectorCollapsed,
    onInspectorCollapse,
    activeJob,
    onCancelJob,
  } = useEditor();

  const [activeTab, setActiveTab] = useState('presets'); // 'presets', 'text', 'effects', 'karaoke', 'export'
  
  const updateStyle = (section, patch) => {
    onStyle((current) => {
      const updated = { ...current };
      if (!updated[section]) updated[section] = {};
      updated[section] = { ...updated[section], ...patch };
      // Fallback/sync flat variables for compatibility with backend flat StyleSettings
      if (section === 'typography') {
        if (patch.fontFamily) updated.font_family = patch.fontFamily;
        if (patch.fontSize) updated.font_size = patch.fontSize;
        if (patch.fontWeight) updated.font_weight = patch.fontWeight;
        if (patch.lineHeight) updated.line_height = patch.lineHeight;
      } else if (section === 'fill') {
        if (patch.textColor) updated.text_color = patch.textColor;
        if (patch.activeColor) updated.active_color = patch.activeColor;
      } else if (section === 'shadow') {
        if (patch.color) updated.shadow_color = patch.color;
      } else if (section === 'position') {
        if (patch.verticalOffset !== undefined) updated.vertical_offset = patch.verticalOffset;
      }
      return updated;
    });
  };

  const selectPreset = (preset) => {
    onStyle(preset);
  };

  const updateRenderOptions = (patch) => onRenderOptions((current) => ({ ...current, ...patch }));

  const isLoadingRender = isLoading?.render || false;
  const isLoadingExport = isLoading?.export || false;
  const exportBusy = isLoadingRender || isLoadingExport;
  const subtitleTypeValue = renderOptions.subtitleType === 'soft' ? 'hard' : renderOptions.subtitleType;

  const fontList = ['Noto Sans Thai', 'Prompt', 'Kanit', 'Sarabun', 'Anuphan', 'IBM Plex Sans Thai'];

  const tools = [
    { id: 'styles', label: 'ปรับแต่งซับ (Sub Styles)', icon: Sparkles },
    { id: 'bgm', label: 'เพลงประกอบ (BGM)', icon: Music2 },
  ];

  return (
    <aside className={`inspector ${isInspectorCollapsed ? 'collapsed' : ''}`}>
      {!isInspectorCollapsed && (
        <div className="inspector-body" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', padding: '0' }}>
          {activeTool === 'styles' && (
            <>
              {/* Internal Tabs matching desktop properties */}
              <div className="inspector-tabs" style={{ display: 'flex', borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#0e0e0f' }}>
                {['presets', 'text', 'effects', 'karaoke', 'export'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                    style={{
                      flex: 1,
                      padding: '10px 0',
                      border: 0,
                      background: 'transparent',
                      color: activeTab === tab ? '#d89443' : '#8d8d8d',
                      fontSize: '11px',
                      fontWeight: activeTab === tab ? '800' : 'normal',
                      cursor: 'pointer',
                      borderBottom: activeTab === tab ? '2px solid #d89443' : '2px solid transparent',
                    }}
                  >
                    {tab === 'presets' && 'พรีเซ็ต'}
                    {tab === 'text' && 'ฟอนต์/รูปทรง'}
                    {tab === 'effects' && 'เส้น/เงา/กล่อง'}
                    {tab === 'karaoke' && 'คาราโอเกะ'}
                    {tab === 'export' && 'ส่งออก & เรนเดอร์'}
                  </button>
                ))}
              </div>

              {/* Tab Contents */}
              <div className="inspector-content" style={{ flex: 1, overflowY: 'auto', padding: '14px' }}>
                
                {/* PRESETS TAB */}
                {activeTab === 'presets' && (
                  <div className="control-group">
                    <h2>เลือกพรีเซ็ตสำเร็จรูป</h2>
                    <CaptionPresetGrid selectedId={style.id} onSelectPreset={selectPreset} />
                  </div>
                )}

                {/* TEXT TAB */}
                {activeTab === 'text' && (
                  <div className="control-group" style={{ display: 'grid', gap: '12px' }}>
                    <h2>การตั้งค่าฟอนต์และรูปทรง</h2>
                    
                    <label className="control-row">
                      <span>แบบอักษร</span>
                      <select
                        value={style.typography?.fontFamily || style.font_family || 'Noto Sans Thai'}
                        onChange={(e) => updateStyle('typography', { fontFamily: e.target.value })}
                      >
                        {fontList.map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </label>

                    <label className="control-row">
                      <span>ขนาด ({style.typography?.fontSize || style.font_size || 42}px)</span>
                      <input
                        type="range"
                        min="24"
                        max="72"
                        value={style.typography?.fontSize || style.font_size || 42}
                        onChange={(e) => updateStyle('typography', { fontSize: Number(e.target.value) })}
                      />
                    </label>

                    <label className="control-row">
                      <span>น้ำหนัก ({style.typography?.fontWeight || style.font_weight || 700})</span>
                      <input
                        type="range"
                        min="400"
                        max="900"
                        step="100"
                        value={style.typography?.fontWeight || style.font_weight || 700}
                        onChange={(e) => updateStyle('typography', { fontWeight: Number(e.target.value) })}
                      />
                    </label>

                    <label className="control-row">
                      <span>ระยะตำแหน่ง ({style.position?.verticalOffset ?? style.vertical_offset ?? 25}%)</span>
                      <input
                        type="range"
                        min="8"
                        max="90"
                        value={style.position?.verticalOffset ?? style.vertical_offset ?? 25}
                        onChange={(e) => updateStyle('position', { verticalOffset: Number(e.target.value) })}
                      />
                    </label>

                    <label className="control-row">
                      <span>สีอักษรเริ่มต้น</span>
                      <input
                        type="color"
                        value={style.fill?.textColor || style.text_color || '#ffffff'}
                        onChange={(e) => updateStyle('fill', { textColor: e.target.value })}
                      />
                    </label>

                    <label className="control-row">
                      <span>สัดส่วนบรรทัด ({(style.typography?.lineHeight || style.line_height || 1.35).toFixed(2)})</span>
                      <input
                        type="range"
                        min="1"
                        max="2"
                        step="0.05"
                        value={style.typography?.lineHeight || style.line_height || 1.35}
                        onChange={(e) => updateStyle('typography', { lineHeight: Number(e.target.value) })}
                      />
                    </label>

                    <label className="control-row">
                      <span>จัดแนว</span>
                      <select
                        value={style.position?.align || 'center'}
                        onChange={(e) => updateStyle('position', { align: e.target.value })}
                      >
                        <option value="left">ซ้าย (Left)</option>
                        <option value="center">กึ่งกลาง (Center)</option>
                        <option value="right">ขวา (Right)</option>
                      </select>
                    </label>

                    {/* Live Font Preview */}
                    <div
                      style={{
                        marginTop: '4px',
                        borderRadius: '10px',
                        background: '#0a0a0b',
                        border: '1px solid rgba(255,255,255,0.06)',
                        padding: '14px',
                        textAlign: style.position?.align || 'center',
                        overflow: 'visible',
                      }}
                    >
                      <span style={{ fontSize: '10px', color: '#555', display: 'block', marginBottom: '8px', textAlign: 'left' }}>
                        ตัวอย่างข้อความ (Live Preview)
                      </span>
                      <div
                        style={{
                          fontFamily: style.typography?.fontFamily || style.font_family || 'Noto Sans Thai',
                          fontSize: `${Math.min(style.typography?.fontSize || style.font_size || 42, 38)}px`,
                          fontWeight: style.typography?.fontWeight || style.font_weight || 700,
                          lineHeight: style.typography?.lineHeight || style.line_height || 1.35,
                          color: style.fill?.textColor || style.text_color || '#ffffff',
                          WebkitTextStroke: style.stroke?.enabled
                            ? `${style.stroke.width || 0}px ${style.stroke.color || '#000'}`
                            : undefined,
                          textShadow: style.shadow?.enabled
                            ? `${style.shadow.offsetX || 0}px ${style.shadow.offsetY || 4}px ${style.shadow.blur || 8}px ${style.shadow.color || '#000'}`
                            : undefined,
                          overflow: 'visible',
                          padding: '4px 0',
                        }}
                      >
                        อยาก ทำ คลิป ดีๆ สักอัน
                      </div>
                      <div
                        style={{
                          fontFamily: style.typography?.fontFamily || style.font_family || 'Noto Sans Thai',
                          fontSize: `${Math.min((style.typography?.fontSize || style.font_size || 42) * 0.7, 28)}px`,
                          fontWeight: style.typography?.fontWeight || style.font_weight || 700,
                          color: (style.fill?.textColor || style.text_color || '#ffffff') + 'aa',
                          overflow: 'visible',
                          marginTop: '4px',
                        }}
                      >
                        ไม้เอก ่ ไม้โท ้ ไม้ตรี ๊ ไม้จัตวา ๋ วรรณยุกต์
                      </div>
                    </div>
                  </div>
                )}

                {/* EFFECTS TAB (STROKE, SHADOW, BACKGROUND) */}
                {activeTab === 'effects' && (
                  <div className="control-group" style={{ display: 'grid', gap: '14px' }}>
                    
                    {/* STROKE */}
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 'bold' }}>
                        <input
                          type="checkbox"
                          checked={style.stroke?.enabled || false}
                          onChange={(e) => updateStyle('stroke', { enabled: e.target.checked })}
                        />
                        เส้นขอบตัวหนังสือ (Stroke)
                      </label>
                      {style.stroke?.enabled && (
                        <div style={{ paddingLeft: '20px', display: 'grid', gap: '8px' }}>
                          <label className="control-row">
                            <span>ความหนา ({style.stroke?.width !== undefined ? style.stroke.width : 1}px)</span>
                            <input
                              type="range"
                              min="1"
                              max="10"
                              value={style.stroke?.width !== undefined ? style.stroke.width : 1}
                              onChange={(e) => updateStyle('stroke', { width: Number(e.target.value) })}
                            />
                          </label>
                          <label className="control-row">
                            <span>สีขอบ</span>
                            <input
                              type="color"
                              value={style.stroke?.color || '#000000'}
                              onChange={(e) => updateStyle('stroke', { color: e.target.value })}
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* SHADOW */}
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '12px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 'bold' }}>
                        <input
                          type="checkbox"
                          checked={style.shadow?.enabled || false}
                          onChange={(e) => updateStyle('shadow', { enabled: e.target.checked })}
                        />
                        เงาตัวหนังสือ (Shadow / Glow)
                      </label>
                      {style.shadow?.enabled && (
                        <div style={{ paddingLeft: '20px', display: 'grid', gap: '8px' }}>
                          <label className="control-row">
                            <span>ความฟุ้ง ({style.shadow?.blur || 8}px)</span>
                            <input
                              type="range"
                              min="0"
                              max="20"
                              value={style.shadow?.blur || 8}
                              onChange={(e) => updateStyle('shadow', { blur: Number(e.target.value) })}
                            />
                          </label>
                          <label className="control-row">
                            <span>เงาเยื้อง X ({style.shadow?.offsetX || 0}px)</span>
                            <input
                              type="range"
                              min="-15"
                              max="15"
                              value={style.shadow?.offsetX || 0}
                              onChange={(e) => updateStyle('shadow', { offsetX: Number(e.target.value) })}
                            />
                          </label>
                          <label className="control-row">
                            <span>เงาเยื้อง Y ({style.shadow?.offsetY || 3}px)</span>
                            <input
                              type="range"
                              min="-15"
                              max="15"
                              value={style.shadow?.offsetY || 3}
                              onChange={(e) => updateStyle('shadow', { offsetY: Number(e.target.value) })}
                            />
                          </label>
                          <label className="control-row">
                            <span>สีเงา</span>
                            <input
                              type="color"
                              value={style.shadow?.color || '#000000'}
                              onChange={(e) => updateStyle('shadow', { color: e.target.value })}
                            />
                          </label>
                        </div>
                      )}
                    </div>

                    {/* BACKGROUND BOX */}
                    <div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 'bold' }}>
                        <input
                          type="checkbox"
                          checked={style.background?.enabled || false}
                          onChange={(e) => updateStyle('background', { enabled: e.target.checked })}
                        />
                        กล่องพื้นหลังซับ (Background Box)
                      </label>
                      {style.background?.enabled && (
                        <div style={{ paddingLeft: '20px', display: 'grid', gap: '8px' }}>
                          <label className="control-row">
                            <span>สีพื้นหลัง</span>
                            <input
                              type="color"
                              value={style.background?.color || '#000000'}
                              onChange={(e) => updateStyle('background', { color: e.target.value })}
                            />
                          </label>
                          <label className="control-row">
                            <span>ความโปร่งใส ({Math.round((style.background?.opacity || 0.7) * 100)}%)</span>
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.05"
                              value={style.background?.opacity || 0.7}
                              onChange={(e) => updateStyle('background', { opacity: Number(e.target.value) })}
                            />
                          </label>
                          <label className="control-row">
                            <span>ความมนกล่อง ({style.background?.radius || 6}px)</span>
                            <input
                              type="range"
                              min="0"
                              max="20"
                              value={style.background?.radius || 6}
                              onChange={(e) => updateStyle('background', { radius: Number(e.target.value) })}
                            />
                          </label>
                          <label className="control-row">
                            <span>ขอบซ้าย-ขวา ({style.background?.paddingX || 10}px)</span>
                            <input
                              type="range"
                              min="0"
                              max="30"
                              value={style.background?.paddingX || 10}
                              onChange={(e) => updateStyle('background', { paddingX: Number(e.target.value) })}
                            />
                          </label>
                          <label className="control-row">
                            <span>ขอบบน-ล่าง ({style.background?.paddingY || 4}px)</span>
                            <input
                              type="range"
                              min="0"
                              max="20"
                              value={style.background?.paddingY || 4}
                              onChange={(e) => updateStyle('background', { paddingY: Number(e.target.value) })}
                            />
                          </label>
                        </div>
                      )}
                    </div>

                  </div>
                )}

                {/* KARAOKE & ANIMATION TAB */}
                {activeTab === 'karaoke' && (
                  <div className="control-group" style={{ display: 'grid', gap: '12px' }}>
                    <h2>การเล่นคำและอนิเมชัน</h2>
                    
                    <label className="control-row">
                      <span>สีตัวอักษรขณะพูด (Active)</span>
                      <input
                        type="color"
                        value={style.fill?.activeColor || style.active_color || '#ffffff'}
                        onChange={(e) => updateStyle('fill', { activeColor: e.target.value })}
                      />
                    </label>

                    {/* Words per Line */}
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '12px', color: '#dfdfdf', display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
                        จำนวนคำต่อบรรทัด ({wordsPerLine || 3} คำ)
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {[1, 2, 3, 4, 5].map((val) => (
                          <button
                            key={val}
                            onClick={() => onWordsPerLine?.(val)}
                            style={{
                              flex: 1,
                              padding: '6px 0',
                              border: `1px solid ${wordsPerLine === val ? '#d89443' : 'rgba(255,255,255,0.08)'}`,
                              borderRadius: '6px',
                              background: wordsPerLine === val ? 'rgba(216,148,67,0.15)' : 'rgba(255,255,255,0.03)',
                              color: wordsPerLine === val ? '#d89443' : '#8d8d8d',
                              fontSize: '13px',
                              fontWeight: wordsPerLine === val ? 'bold' : 'normal',
                              cursor: 'pointer',
                            }}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                      <span style={{ fontSize: '10px', color: '#666', marginTop: '4px', display: 'block' }}>
                        ใช้กับทั้ง Preview และการเรนเดอร์ ASS/SRT
                      </span>
                    </div>

                    <label className="control-row">
                      <span>ประเภทไฮไลต์คาราโอเกะ</span>
                      <select
                        value={style.karaoke?.mode || 'word'}
                        onChange={(e) => updateStyle('karaoke', { mode: e.target.value })}
                      >
                        <option value="none">ไม่มีเอฟเฟกต์ (None)</option>
                        <option value="word">เน้นสีทีละคำพูด (Word Karaoke)</option>
                      </select>
                    </label>

                    {style.karaoke?.mode === 'word' && (
                      <>
                        <label className="control-row">
                          <span>ขนาดซูมคำขณะพูด ({style.karaoke?.activeScale || 1.0}x)</span>
                          <input
                            type="range"
                            min="1"
                            max="1.3"
                            step="0.05"
                            value={style.karaoke?.activeScale || 1.0}
                            onChange={(e) => updateStyle('karaoke', { activeScale: Number(e.target.value) })}
                          />
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                          <input
                            type="checkbox"
                            checked={style.karaoke?.dimInactive || false}
                            onChange={(e) => updateStyle('karaoke', { dimInactive: e.target.checked })}
                          />
                          ลดระดับความเข้มคำรอบข้างขณะพูด (Dim Inactive)
                        </label>
                      </>
                    )}

                    <div style={{ 
                      marginTop: '12px', 
                      padding: '12px', 
                      borderRadius: '8px', 
                      background: 'rgba(216,148,67,0.04)', 
                      border: '1px solid rgba(216,148,67,0.15)',
                      textAlign: 'center' 
                    }}>
                      <span style={{ fontSize: '11px', color: '#d89443', display: 'block', fontWeight: 'bold' }}>
                        ✨ ตั้งค่าอนิเมชันขยับคำ
                      </span>
                      <span style={{ fontSize: '10.5px', color: '#8d8d8d', marginTop: '4px', display: 'block', lineHeight: '1.4' }}>
                        กรุณาใช้งานจากแผงแอนิเมชันแบบถาวรที่ตรึงอยู่ด้านขวาของหน้าต่างพรีวิววิดีโอ
                      </span>
                    </div>

                  </div>
                )}

                {/* RENDER & EXPORT TAB */}
                {activeTab === 'export' && (
                  <div className="control-group" style={{ display: 'grid', gap: '12px' }}>
                    {/* Subtitle Downloads first */}
                    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '14px', marginBottom: '4px' }}>
                      <h2 style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#dfdfdf' }}>ดาวน์โหลดไฟล์ซับลงเครื่อง PC local</h2>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
                        <button className="button accent" style={{ background: 'rgba(216, 148, 67, 0.15)', color: '#d89443', border: '1px solid rgba(216, 148, 67, 0.3)' }} onClick={() => onSubtitleExport('srt')} disabled={exportBusy}>SRT (.srt)</button>
                        <button className="button ghost" onClick={() => onSubtitleExport('vtt')} disabled={exportBusy}>VTT (.vtt)</button>
                        <button className="button ghost" onClick={() => onSubtitleExport('ass')} disabled={exportBusy}>ASS (.ass)</button>
                        <button className="button ghost" onClick={() => onSubtitleExport('txt')} disabled={exportBusy}>TXT (.txt)</button>
                      </div>
                    </div>

                    <h2 style={{ marginTop: '4px' }}>เรนเดอร์วิดีโอ (Burn-in Subtitles)</h2>
                    
                    <label className="control-row">
                      <span>ประเภทคำบรรยาย</span>
                      <select value={subtitleTypeValue} onChange={(e) => updateRenderOptions({ subtitleType: e.target.value })} disabled={exportBusy}>
                        <option value="hard">ฝังซับในวิดีโอ (Hard Subtitle)</option>
                        <option value="soft" disabled>แยกแทร็กซับไตเติล (กำลังพัฒนา)</option>
                      </select>
                    </label>

                    <label className="control-row">
                      <span>ความละเอียด</span>
                      <select value={renderOptions.resolution} onChange={(e) => updateRenderOptions({ resolution: e.target.value })} disabled={exportBusy}>
                        <option>1080p</option>
                        <option>720p</option>
                        <option>1440p</option>
                      </select>
                    </label>

                    <label className="control-row">
                      <span>อัตราเฟรมเรต (FPS)</span>
                      <select value={renderOptions.fps} onChange={(e) => updateRenderOptions({ fps: Number(e.target.value) })} disabled={exportBusy}>
                        <option value="30">30 FPS</option>
                        <option value="24">24 FPS</option>
                        <option value="60">60 FPS</option>
                      </select>
                    </label>

                    {isLoadingRender && activeJob?.type === 'render' ? (
                      <button className="button danger full" onClick={onCancelJob} style={{ marginTop: '8px', backgroundColor: '#ef4444', color: '#ffffff' }}>
                        ยกเลิกเรนเดอร์
                      </button>
                    ) : (
                      <button className="button accent full" onClick={onRender} style={{ marginTop: '8px' }} disabled={exportBusy}>
                        {isLoadingRender ? 'กำลังเรนเดอร์วิดีโอ...' : 'เรนเดอร์วิดีโอจริง (Burn-in)'}
                      </button>
                    )}
                  </div>
                )}

              </div>
            </>
          )}

          {activeTool === 'bgm' && (
            <div className="inspector-content" style={{ padding: '14px', overflowY: 'auto' }}>
              <div className="control-group">
                <h2>การตั้งค่าเพลงประกอบ (BGM)</h2>
                <div style={{ marginBottom: '12px', fontSize: '12px' }}>
                  {audioSettings.bgm_path ? (
                    <span style={{ color: '#f4c64f' }}>โหลดเพลง: ...{audioSettings.bgm_path.split('/').pop()}</span>
                  ) : (
                    <span style={{ color: '#8d8d8d' }}>ยังไม่ได้เลือกเพลงประกอบ</span>
                  )}
                </div>
                
                {/* File selection inside tool frame */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  <button className="button ghost full" disabled title="ฟีเจอร์นี้จัดการจากแถบมีเดียแผงซ้ายมือ">
                    จัดการเพลงจากแผงควบคุมซ้ายมือ
                  </button>
                </div>

                <label className="control-row">
                  <span>ระดับเสียง ({Math.round(audioSettings.bgm_volume * 100)}%)</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={audioSettings.bgm_volume}
                    onChange={(e) => onAudioSettings({ ...audioSettings, bgm_volume: Number(e.target.value) })}
                  />
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginTop: '10px' }}>
                  <input
                    type="checkbox"
                    checked={audioSettings.bgm_loop}
                    onChange={(e) => onAudioSettings({ ...audioSettings, bgm_loop: e.target.checked })}
                  />
                  เล่นวนซ้ำเพลงประกอบอัตโนมัติ
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Vertical Tool Rail */}
      <div className="tool-rail" style={{ background: '#09090a', borderLeft: '1px solid rgba(255,255,255,0.06)' }}>
        <button className="icon-button soft" onClick={() => onInspectorCollapse(!isInspectorCollapsed)} title={isInspectorCollapsed ? 'ขยายแถบเครื่องมือ' : 'ย่อแถบเครื่องมือ'}>
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
                onInspectorCollapse(false);
              }}
              title={tool.label}
              style={{
                width: '32px',
                height: '32px',
                display: 'grid',
                placeItems: 'center',
                margin: '4px 0',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <Icon size={16} />
            </button>
          );
        })}
      </div>
    </aside>
  );
}
export default CaptionStyleInspector;
