import React, { useState, useEffect, useRef } from 'react';
import { Plus, Search, Subtitles } from 'lucide-react';
import { formatPrecise } from '../subtitleUtils';

export function TranscriptPanel({ subtitles, activeWord, wordsPerLine, onWordsPerLine, onWordChange, onDeleteWord, onAutocorrect }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [autocorrectProvider, setAutocorrectProvider] = useState('local');
  const [geminiApiKey, setGeminiApiKey] = useState(() => localStorage.getItem('gemini_api_key') || '');

  // Save Gemini API key to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('gemini_api_key', geminiApiKey);
  }, [geminiApiKey]);

  // Auto scroll active row into view
  useEffect(() => {
    if (!activeWord) return;
    const activeEl = document.querySelector('.word-row.active');
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [activeWord]);

  const words = (subtitles?.segments || []).flatMap((segment) =>
    (segment.words || []).map((word) => ({ ...word, segmentId: segment.id }))
  );

  const filteredWords = searchQuery
    ? words.filter((w) => w.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : words;

  const handleAutocorrectClick = () => {
    onAutocorrect(autocorrectProvider, geminiApiKey);
  };

  return (
    <aside className="transcript-panel">
      <div className="panel-title">
        <div>
          <strong>Transcript</strong>
          <span>{filteredWords.length} เวิร์ด</span>
        </div>
        <button className="icon-button soft" disabled title="เพิ่มเวิร์ด (ยังไม่เปิดใช้งาน)"><Plus size={16} /></button>
      </div>
      
      <label className="search-box">
        <Search size={14} />
        <input 
          placeholder="ค้นหาข้อความซับ..." 
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
        />
      </label>

      <div className="autocorrect-setup" style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', margin: '4px 0' }}>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <span style={{ fontSize: '11px', color: '#8d8d8d' }}>โมเดลตรวจคำ:</span>
          <select 
            style={{ flex: 1, minHeight: '28px', fontSize: '12px', padding: '0 4px' }}
            value={autocorrectProvider} 
            onChange={(event) => setAutocorrectProvider(event.target.value)}
          >
            <option value="local">จัดระเบียบช่องว่าง (Local)</option>
            <option value="gemini">แก้ไขสะกดคำด้วย Gemini AI</option>
          </select>
        </div>
        
        {autocorrectProvider === 'gemini' && (
          <input 
            type="password" 
            style={{ minHeight: '28px', fontSize: '12px', width: '100%' }}
            placeholder="ใส่คีย์ Gemini API..."
            value={geminiApiKey}
            onChange={(event) => setGeminiApiKey(event.target.value)}
          />
        )}
        
        <button className="button accent full" onClick={handleAutocorrectClick}>
          ตรวจคำอัตโนมัติ
        </button>
      </div>

      <div className="density-block">
        <span>คำ/บรรทัด</span>
        <div className="segmented">
          {[1, 2, 3, 4, 5].map((value) => (
            <button key={value} className={wordsPerLine === value ? 'active' : ''} onClick={() => onWordsPerLine(value)}>{value}</button>
          ))}
        </div>
      </div>
      <div className="mode-row">
        <button className="active">โหมดบรรทัด</button>
        <button disabled title="โหมดแบ่งคำ (ยังไม่เปิดใช้งาน)">โหมดแบ่งคำ</button>
      </div>
      <span className="hint-text">จัดซับใหม่เป็น {wordsPerLine} คำต่อข้อความแล้ว</span>
      <div className="word-list">
        {filteredWords.map((word, index) => {
          const isActive = activeWord === word.id;
          return (
            <div key={word.id} className={`word-row ${isActive ? 'active' : ''}`}>
              <span className="word-index">{String(index + 1).padStart(2, '0')}</span>
              <div className="word-main">
                <small>{formatPrecise(word.start)} - {formatPrecise(word.end)}</small>
                <input value={word.text} onChange={(event) => onWordChange(word.segmentId, word.id, event.target.value)} />
              </div>
              <button 
                onClick={() => onDeleteWord(word.segmentId, word.id)} 
                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)' }}
              >
                ลบ
              </button>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
