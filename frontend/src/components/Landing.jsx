import React, { useState } from 'react';
import { Upload, FolderOpen, Trash2, Video, CheckCircle2, AlertCircle } from 'lucide-react';
import { API, apiRequest } from '../api';

function ProjectThumbnail({ proj }) {
  const videoRef = React.useRef(null);
  const src = `${API}/media/${proj.source_video.replaceAll('\\', '/')}`;

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  const handleMouseLeave = () => {
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.currentTime = 0;
    }
  };

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0b',
      }}
    >
      <video
        ref={videoRef}
        src={src}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
        preload="metadata"
        muted
        playsInline
      />
      {/* Semi-transparent hover overlay */}
      <div 
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(0deg, rgba(0,0,0,0.65) 0%, rgba(0,0,0,0) 60%)',
          pointerEvents: 'none',
          zIndex: 1,
        }}
      />
    </div>
  );
}

export function Landing({ projects, onProject, onUpload, onRefreshProjects, isLoading, setToast }) {
  const [pendingDeleteId, setPendingDeleteId] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const isLoadingUpload = isLoading?.upload || false;
  const isLoadingProjects = isLoading?.projects || false;
  const isBusy = isLoadingUpload || isDeleting;
  const pendingDeleteProject = projects.find((item) => item.id === pendingDeleteId);

  const handleDelete = async () => {
    if (!pendingDeleteId) return;
    try {
      setIsDeleting(true);
      await apiRequest(`/api/project/${pendingDeleteId}`, { method: 'DELETE' });
      setPendingDeleteId('');
      await onRefreshProjects();
      setToast?.('ลบโปรเจกต์เรียบร้อยแล้ว');
    } catch (err) {
      setToast?.(`ลบโปรเจกต์ไม่สำเร็จ: ${err.message}`);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusText = (proj) => {
    // Determine status text based on project properties
    if (proj.status === 'rendered') return 'เรนเดอร์แล้ว';
    if (proj.status === 'transcribed' || proj.subtitles_path) return 'ถอดเสียงแล้ว';
    return 'อัปโหลดวิดีโอแล้ว';
  };

  return (
    <main className="landing-page" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      {/* Brand Navigation Bar */}
      <nav className="landing-nav" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', minHeight: '60px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <Brand />
        <div style={{ color: '#8d8d8d', fontSize: '12px' }}>
          เวอร์ชัน 1.0 (Desktop Rebuild)
        </div>
      </nav>

      {/* Main Container Split Grid */}
      <div className="landing-shell" style={{ flex: 1, display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', minHeight: 0 }}>
        
        {/* Left Control Column */}
        <div className="landing-create-column" style={{ padding: '24px', borderRight: '1px solid rgba(255,255,255,0.06)', background: 'rgba(20, 20, 22, 0.4)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <h2 style={{ fontSize: '18px', margin: '0 0 6px', color: '#dfdfdf' }}>สร้างโปรเจกต์</h2>
            <p style={{ fontSize: '12px', color: '#8d8d8d', margin: 0 }}>อัปโหลดวิดีโอใหม่เพื่อเริ่มต้นการถอดความสระและตั้งค่ารูปแบบคาราโอเกะ</p>
          </div>

          <label 
            className="dropzone" 
            style={{ 
              opacity: isBusy ? 0.6 : 1, 
              pointerEvents: isBusy ? 'none' : 'auto',
              minHeight: '160px',
              border: '2px dashed rgba(255,255,255,0.12)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              background: 'rgba(255,255,255,0.02)',
              cursor: 'pointer',
              padding: '16px',
              textAlign: 'center',
              transition: 'background 0.2s'
            }}
          >
            <Upload size={32} style={{ color: '#d89443' }} />
            <strong style={{ fontSize: '14px', color: '#dfdfdf' }}>{isLoadingUpload ? 'กำลังอัปโหลด...' : 'นำเข้าวิดีโอ (Import)'}</strong>
            <span style={{ fontSize: '11px', color: '#8d8d8d' }}>รองรับไฟล์วิดีโอ MP4, WebM, MOV, AVI (สูงสุด 500MB)</span>
            <input type="file" accept="video/*" onChange={onUpload} disabled={isBusy} style={{ display: 'none' }} />
          </label>

          <div style={{ marginTop: 'auto', padding: '12px', borderRadius: '8px', background: 'rgba(216, 148, 67, 0.05)', border: '1px solid rgba(216, 148, 67, 0.15)' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#d89443', display: 'block', marginBottom: '4px' }}>💡 คำแนะนำเพิ่มเติม</span>
            <span style={{ fontSize: '11px', color: '#8d8d8d', lineHeight: '1.4' }}>
              หลังจากอัปโหลดเสร็จสิ้น ระบบจะเปลี่ยนไปหน้าตัดต่อให้โดยอัตโนมัติ และคุณสามารถเลือกตั้งค่าสไตล์ ฟอนต์ภาษาไทย คาราโอเกะ หรือตรวจจับคำสะกดผิดด้วย AI ได้
            </span>
          </div>
        </div>

        {/* Right Recent Projects Area */}
        <div className="landing-projects-column" style={{ padding: '24px', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', margin: '0 0 4px', color: '#dfdfdf' }}>โปรเจกต์ล่าสุด (Recent Projects)</h2>
            <span style={{ fontSize: '12px', color: '#8d8d8d' }}>เปิดแก้ไขหรือจัดการผลงานวิดีโอซับไตเติลของคุณ</span>
          </div>

          {isLoadingProjects ? (
            <div className="project-empty-state" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8d8d8d', gap: '10px' }}>
              <Video size={48} style={{ opacity: 0.3 }} />
              <span>กำลังโหลดโปรเจกต์...</span>
            </div>
          ) : projects.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#8d8d8d', gap: '10px' }}>
              <Video size={48} style={{ opacity: 0.3 }} />
              <span>ยังไม่มีโปรเจกต์ที่ทำไว้ก่อนหน้านี้</span>
            </div>
          ) : (
            <div className="project-scroll" style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
              <div className="project-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                {projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="project-card"
                    style={{
                      border: '1px solid rgba(255,255,255,0.06)',
                      borderRadius: '12px',
                      background: 'rgba(30, 30, 32, 0.4)',
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    {/* Visual Card Top Box */}
                    <div
                      style={{
                        height: '110px',
                        background: 'linear-gradient(135deg, #161618, #2a2a2f)',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#d89443',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {proj.source_video ? (
                        <ProjectThumbnail proj={proj} />
                      ) : (
                        <Video size={36} style={{ opacity: 0.7 }} />
                      )}
                      <div style={{ position: 'absolute', bottom: '6px', left: '6px', background: 'rgba(0,0,0,0.65)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', color: '#a0a0a0', zIndex: 2 }}>
                        ID: {proj.id.slice(0, 8)}
                      </div>
                    </div>

                    <div style={{ minWidth: 0 }}>
                      <strong 
                        style={{ fontSize: '14px', display: 'block', color: '#dfdfdf', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                        title={proj.name}
                      >
                        {proj.name}
                      </strong>
                      <span style={{ fontSize: '11px', color: '#8d8d8d', marginTop: '2px', display: 'block' }}>
                        สถานะ: <span style={{ color: proj.status === 'rendered' ? '#00e676' : '#d89443' }}>{getStatusText(proj)}</span>
                      </span>
                    </div>

                    {/* Actions Row */}
                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <button
                        className="button ghost"
                        onClick={() => onProject(proj.id)}
                        disabled={isBusy}
                        style={{ flex: 1, minHeight: '30px', fontSize: '12px', gap: '4px' }}
                      >
                        <FolderOpen size={13} /> เปิดงาน
                      </button>
                      <button
                        className="button danger"
                        onClick={() => setPendingDeleteId(proj.id)}
                        disabled={isBusy}
                        style={{ minWidth: '32px', width: '32px', minHeight: '30px', padding: 0, display: 'grid', placeItems: 'center' }}
                        title="ลบโปรเจกต์"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Delete Confirmation Modal */}
      {pendingDeleteId && (
        <div className="modal-backdrop" role="presentation">
          <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="delete-project-title">
            <h2 id="delete-project-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#ff8a8a' }}>
              <AlertCircle size={20} /> ลบโปรเจกต์นี้ถาวร?
            </h2>
            <p style={{ margin: '8px 0', fontSize: '14px', color: '#dfdfdf' }}>
              <strong>{pendingDeleteProject?.name || pendingDeleteId}</strong>
            </p>
            <span style={{ color: '#8d8d8d', fontSize: '12px', lineHeight: '1.45' }}>
              ไฟล์วิดีโอต้นฉบับ ไฟล์เสียงที่สกัด ไฟล์เสียงประกอบ (BGM) คำบรรยายซับไตเติล และวิดีโอที่เรนเดอร์ไว้ทั้งหมดจะถูกลบออกจากเครื่องคอมพิวเตอร์และไม่สามารถกู้คืนได้
            </span>
            <div className="modal-actions" style={{ marginTop: '12px' }}>
              <button className="button ghost" onClick={() => setPendingDeleteId('')} disabled={isDeleting}>ยกเลิก</button>
              <button className="button danger" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'กำลังลบโปรเจกต์...' : 'ลบถาวร'}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

function Brand() {
  return (
    <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div className="fs-mark" style={{ width: '36px', height: '36px', borderRadius: '8px' }}>
        <span style={{ fontSize: '15px' }}>FS</span>
      </div>
      <div>
        <strong style={{ fontSize: '15px', color: '#ffd69b' }}>FASTSUB Studio</strong>
        <span style={{ color: '#8d8d8d', fontSize: '10px', display: 'block', marginTop: '1px' }}>Local-First Thai Caption Rebuilder</span>
      </div>
    </div>
  );
}
