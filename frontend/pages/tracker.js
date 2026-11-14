import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { requireAuth, getApplications, updateApplication, deleteApplication } from '../lib/api';

const STAGES = [
  { key: 'saved', label: 'Saved', color: '#64748b' },
  { key: 'applied', label: 'Applied', color: '#2563eb' },
  { key: 'interviewing', label: 'Interviewing', color: '#d97706' },
  { key: 'offer', label: 'Offer', color: '#059669' },
  { key: 'rejected', label: 'Rejected', color: '#dc2626' },
];

export default function Tracker() {
  const router = useRouter();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const user = await requireAuth(router);
      if (!user) return;
      load();
    })();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await getApplications();
      setApps(res.applications || []);
    } catch (e) {
      console.error('Failed to load applications', e);
    } finally {
      setLoading(false);
    }
  }

  async function moveTo(app, stage) {
    // Optimistic update
    setApps((prev) => prev.map((a) => (a._id === app._id ? { ...a, pipelineStage: stage } : a)));
    try {
      await updateApplication(null, app._id, { pipelineStage: stage });
    } catch (e) {
      console.error('Failed to update stage', e);
      load(); // revert on error
    }
  }

  async function saveNotes(app, notes) {
    setApps((prev) => prev.map((a) => (a._id === app._id ? { ...a, notes } : a)));
    await updateApplication(null, app._id, { notes });
  }

  async function remove(app) {
    if (!confirm(`Remove "${app.jobTitle}" from your tracker?`)) return;
    setApps((prev) => prev.filter((a) => a._id !== app._id));
    try {
      await deleteApplication(null, app._id);
    } catch (e) {
      console.error('Failed to delete', e);
      load();
    }
  }

  const byStage = (stage) => apps.filter((a) => (a.pipelineStage || 'saved') === stage);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '24px' }}>
      <div style={{ maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, color: '#1e293b' }}>Application Tracker</h1>
            <p style={{ margin: '4px 0 0', color: '#64748b' }}>
              {apps.length} {apps.length === 1 ? 'application' : 'applications'} across your pipeline
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              background: 'white',
              color: '#667eea',
              border: '2px solid #667eea',
              padding: '10px 18px',
              borderRadius: 10,
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ← Back to Jobs
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>Loading your pipeline…</div>
        ) : apps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#64748b', background: 'white', borderRadius: 16 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
            No applications tracked yet. Find jobs and click <strong>Track</strong> to add them here.
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 16, overflowX: 'auto', paddingBottom: 16 }}>
            {STAGES.map((stage) => {
              const items = byStage(stage.key);
              return (
                <div
                  key={stage.key}
                  style={{ minWidth: 280, flex: '1 1 280px', background: '#f1f5f9', borderRadius: 14, padding: 12 }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, padding: '4px 4px' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: stage.color }} />
                    <h3 style={{ margin: 0, fontSize: 15, color: '#334155' }}>{stage.label}</h3>
                    <span style={{ marginLeft: 'auto', fontSize: 13, color: '#94a3b8', fontWeight: 600 }}>
                      {items.length}
                    </span>
                  </div>

                  {items.map((app) => (
                    <ApplicationCard key={app._id} app={app} stage={stage} onMove={moveTo} onRemove={remove} onSaveNotes={saveNotes} />
                  ))}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function ApplicationCard({ app, stage, onMove, onRemove, onSaveNotes }) {
  const stageIndex = STAGES.findIndex((s) => s.key === stage.key);
  const [showNotes, setShowNotes] = useState(!!app.notes);
  const [notes, setNotes] = useState(app.notes || '');
  const [savingNotes, setSavingNotes] = useState(false);
  const dirty = notes !== (app.notes || '');

  async function handleSaveNotes() {
    setSavingNotes(true);
    await onSaveNotes(app, notes);
    setSavingNotes(false);
  }
  return (
    <div
      style={{
        background: 'white',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        borderLeft: `3px solid ${stage.color}`,
      }}
    >
      <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 15 }}>{app.jobTitle}</div>
      <div style={{ color: '#64748b', fontSize: 13, marginBottom: 10 }}>{app.companyName}</div>

      {app.applyUrl ? (
        <a
          href={app.applyUrl}
          target="_blank"
          rel="noreferrer"
          style={{ fontSize: 12, color: '#667eea', textDecoration: 'none' }}
        >
          🔗 View posting
        </a>
      ) : null}

      <div style={{ display: 'flex', gap: 6, marginTop: 12, alignItems: 'center' }}>
        <select
          value={stage.key}
          onChange={(e) => onMove(app, e.target.value)}
          style={{
            flex: 1,
            padding: '6px 8px',
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            fontSize: 13,
            color: '#334155',
            cursor: 'pointer',
          }}
        >
          {STAGES.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          onClick={() => onRemove(app)}
          title="Remove"
          style={{
            background: '#fef2f2',
            color: '#dc2626',
            border: 'none',
            borderRadius: 8,
            padding: '6px 10px',
            cursor: 'pointer',
            fontSize: 13,
          }}
        >
          🗑
        </button>
      </div>

      {/* Notes */}
      <div style={{ marginTop: 10 }}>
        {!showNotes ? (
          <button onClick={() => setShowNotes(true)} style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', fontSize: 12, fontWeight: 600, padding: 0 }}>
            📝 Add notes
          </button>
        ) : (
          <div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notes (contacts, interview dates, follow-ups…)"
              rows={3}
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', color: '#334155' }}
            />
            {dirty && (
              <button onClick={handleSaveNotes} disabled={savingNotes} style={{ marginTop: 6, background: '#667eea', color: 'white', border: 'none', borderRadius: 8, padding: '5px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {savingNotes ? 'Saving…' : 'Save notes'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {app.createdAt && <span>Added {new Date(app.createdAt).toLocaleDateString()}</span>}
        {app.appliedAt && stageIndex > 0 && <span>· Applied {new Date(app.appliedAt).toLocaleDateString()}</span>}
      </div>
    </div>
  );
}
