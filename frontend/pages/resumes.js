import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { requireAuth, listResumeVersions, deleteResumeVersion } from '../lib/api';
import { toast } from '../lib/toast';

export default function Resumes() {
  const router = useRouter();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      const user = await requireAuth(router);
      if (!user) return;
      load();
    })();
  }, []);

  async function load() {
    setLoading(true);
    const res = await listResumeVersions();
    setVersions(res.versions || []);
    setLoading(false);
  }

  async function remove(v) {
    if (!confirm(`Delete "${v.title}"?`)) return;
    setVersions((prev) => prev.filter((x) => x.id !== v.id));
    if (selected?.id === v.id) setSelected(null);
    await deleteResumeVersion(v.id);
  }

  function copy(v) {
    navigator.clipboard.writeText(v.content);
    toast('✅ Résumé copied');
  }

  function download(v) {
    const blob = new Blob([v.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(v.companyName || 'resume').replace(/\s+/g, '_')}_${(v.jobTitle || '').replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: 24 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, color: '#1e293b' }}>My Résumés</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b' }}>
              {versions.length} saved {versions.length === 1 ? 'version' : 'versions'} — tailored to specific jobs
            </p>
          </div>
          <button onClick={() => router.push('/dashboard')} style={{ background: 'white', color: '#667eea', border: '2px solid #667eea', padding: '10px 18px', borderRadius: 10, cursor: 'pointer', fontWeight: 600 }}>
            ← Back to Jobs
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Loading…</div>
        ) : versions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b', background: 'white', borderRadius: 16 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📄</div>
            No résumés yet. Open a job and click <strong>Tailor Resume</strong> — each one is saved here.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 1.2fr' : '1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {versions.map((v) => (
                <div key={v.id} style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderLeft: `3px solid ${selected?.id === v.id ? '#667eea' : '#e2e8f0'}` }}>
                  <div style={{ fontWeight: 700, color: '#1e293b' }}>{v.jobTitle || 'Résumé'}</div>
                  <div style={{ color: '#64748b', fontSize: 13 }}>{v.companyName}</div>
                  <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 4 }}>{new Date(v.createdAt).toLocaleString()}</div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <button onClick={() => setSelected(v)} style={btn('#667eea')}>View</button>
                    <button onClick={() => copy(v)} style={btn('#475569', '#f1f5f9')}>Copy</button>
                    <button onClick={() => download(v)} style={btn('#475569', '#f1f5f9')}>Download</button>
                    <button onClick={() => remove(v)} style={btn('#dc2626', '#fef2f2')}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
            {selected && (
              <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', maxHeight: '75vh', overflow: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                  <strong>{selected.jobTitle} · {selected.companyName}</strong>
                  <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: 20 }}>×</button>
                </div>
                <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 14, lineHeight: 1.6, color: '#334155', margin: 0 }}>{selected.content}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function btn(color, bg = 'white') {
  return { background: bg, color, border: bg === 'white' ? `1.5px solid ${color}` : 'none', borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600, cursor: 'pointer' };
}
