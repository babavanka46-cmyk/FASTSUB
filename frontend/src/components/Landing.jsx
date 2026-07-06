import React, { useState } from 'react';
import { Upload } from 'lucide-react';
import { apiRequest } from '../api';

export function Landing({ projects, onProject, onUpload, onRefreshProjects }) {
  const [selectedDeleteId, setSelectedDeleteId] = useState('');

  const handleDelete = async () => {
    if (!selectedDeleteId) return;
    const proj = projects.find((p) => p.id === selectedDeleteId);
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการลบโปรเจกต์ "${proj?.name || selectedDeleteId}"?`)) {
      return;
    }
    try {
      await apiRequest(`/api/project/${selectedDeleteId}`, { method: 'DELETE' });
      setSelectedDeleteId('');
      onRefreshProjects();
      alert('ลบโปรเจกต์เรียบร้อยแล้ว');
    } catch (err) {
      alert(`ลบโปรเจกต์ไม่สำเร็จ: ${err.message}`);
    }
  };

  return (
    <main className="landing-page">
      <nav className="landing-nav">
        <Brand />
        <div className="pill-row">
          <button className="chip" disabled title="เพจหลัก (ยังไม่เปิดใช้งาน)">เพจหลัก</button>
          <button className="chip" disabled title="FASTSUB Local (ยังไม่เปิดใช้งาน)">FASTSUB Local</button>
        </div>
      </nav>
      <section className="landing-hero">
        <div className="hero-copy">
          <div className="fs-mark hero-mark"><span>FS</span></div>
          <span className="eyebrow">FASTSUB • ซับ • เอฟเฟกต์เสียง • เพลงประกอบ</span>
          <h1>อัปโหลดวิดีโอ แล้วเริ่มได้เลย</h1>
          <p>ถอดเสียงทำซับด้วย AI ใส่ซาวด์เอฟเฟกต์ ใส่เพลงประกอบ จัดสไตล์ ส่งออก และเรนเดอร์ครบในที่เดียว</p>
          <div className="pill-row">
            <button className="chip" disabled title="เพจหลัก (ยังไม่เปิดใช้งาน)">เพจหลัก</button>
            <button className="chip" disabled title="FASTSUB Studio (ยังไม่เปิดใช้งาน)">FASTSUB Studio</button>
          </div>
        </div>
        <div className="upload-card">
          <div className="upload-head">
            <div>
              <strong>สร้างโปรเจกต์ใหม่</strong>
              <span>ตั้งค่าเริ่มต้นสำหรับวิดีโอของคุณ</span>
            </div>
          </div>
          
          <div className="project-management-row" style={{ display: 'flex', gap: '8px', margin: '12px 0' }}>
            <select style={{ flex: 1 }} onChange={(event) => onProject(event.target.value)} defaultValue="">
              <option value="">เปิดโปรเจกต์ที่มีอยู่...</option>
              {projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
          </div>
          
          <div className="project-management-row" style={{ display: 'flex', gap: '8px', margin: '12px 0 20px' }}>
            <select style={{ flex: 1 }} value={selectedDeleteId} onChange={(event) => setSelectedDeleteId(event.target.value)}>
              <option value="">เลือกโปรเจกต์เพื่อลบ...</option>
              {projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
            </select>
            <button className="button" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }} onClick={handleDelete} disabled={!selectedDeleteId}>
              ลบ
            </button>
          </div>

          <label className="dropzone">
            <Upload size={30} />
            <strong>อัปโหลดวิดีโอ</strong>
            <span>ลากไฟล์วิดีโอมาวาง หรือคลิกเพื่อเลือกไฟล์</span>
            <input type="file" accept="video/*" onChange={onUpload} />
          </label>
          
          <label className="field">
            <span>YouTube URL (ยังไม่เปิดใช้งาน)</span>
            <input disabled placeholder="วางลิงก์ YouTube (ยังไม่เปิดใช้งาน)" />
          </label>
          <div className="landing-grid">
            <label className="field">
              <span>ภาษาเสียง</span>
              <select defaultValue="th"><option value="th">ไทย</option><option value="en">English</option></select>
            </label>
            <label className="field">
              <span>สัดส่วนวิดีโอ</span>
              <select defaultValue="9:16"><option>9:16 แนวตั้ง</option><option>16:9 แนวนอน</option></select>
            </label>
            <label className="field">
              <span>โหมดซับ</span>
              <select defaultValue="auto"><option value="auto">ถอดเสียงอัตโนมัติ</option><option value="manual">สร้างซับเอง</option></select>
            </label>
          </div>
          <div className="upload-foot">
            <span>กรุณาอัปโหลดไฟล์ก่อน</span>
            <label className="button accent">
              สร้างโปรเจกต์
              <input type="file" accept="video/*" onChange={onUpload} />
            </label>
          </div>
        </div>
      </section>
    </main>
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
