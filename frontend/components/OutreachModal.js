import { useEffect, useState } from 'react';
import { generateOutreach, getToken } from '../lib/api';

const TONES = [
  { key: 'professional', label: 'Professional' },
  { key: 'warm', label: 'Warm' },
  { key: 'confident', label: 'Confident' },
  { key: 'concise', label: 'Concise' },
];

export default function OutreachModal({ job, onClose }) {
  const [tone, setTone] = useState('professional');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [tab, setTab] = useState('email');
  const [copied, setCopied] = useState('');

  async function generate(selectedTone) {
    setLoading(true);
    setError('');
    setCopied('');
    try {
      const token = getToken();
      const data = await generateOutreach(token, {
        jobTitle: job.title,
        companyName: job.company_name,
        jobDescription: (job.description || '').replace(/<[^>]+>/g, ' '),
        tone: selectedTone,
      });
      if (data.error) setError(data.error);
      else setResult(data);
    } catch (e) {
      setError('Failed to generate outreach. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    generate(tone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onToneChange(t) {
    setTone(t);
    generate(t);
  }

  async function copy(text, which) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      setError('Could not copy to clipboard.');
    }
  }

  const emailText = result ? `Subject: ${result.email.subject}\n\n${result.email.body}` : '';
  const linkedinText = result ? result.linkedin.body : '';

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: 16,
          maxWidth: 620,
          width: '100%',
          maxHeight: '88vh',
          overflowY: 'auto',
          padding: 28,
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, color: '#1e293b' }}>Recruiter Outreach</h2>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>
              {job.title} · {job.company_name}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#94a3b8' }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Tone selector */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          {TONES.map((t) => (
            <button
              key={t.key}
              onClick={() => onToneChange(t.key)}
              disabled={loading}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                cursor: loading ? 'default' : 'pointer',
                border: `1.5px solid ${tone === t.key ? '#667eea' : '#e2e8f0'}`,
                background: tone === t.key ? '#667eea' : 'white',
                color: tone === t.key ? 'white' : '#475569',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e2e8f0', marginBottom: 16 }}>
          {['email', 'linkedin'].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '8px 16px',
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                color: tab === t ? '#667eea' : '#94a3b8',
                borderBottom: `2px solid ${tab === t ? '#667eea' : 'transparent'}`,
                marginBottom: -1,
              }}
            >
              {t === 'email' ? '✉️ Email' : '💬 LinkedIn'}
            </button>
          ))}
        </div>

        {loading && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>Drafting your outreach…</div>
        )}
        {error && !loading && (
          <div style={{ padding: 16, background: '#fef2f2', borderRadius: 12, color: '#b91c1c', fontSize: 14 }}>
            {error}
          </div>
        )}

        {result && !loading && tab === 'email' && (
          <div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Subject</label>
            <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 8, margin: '4px 0 12px', fontSize: 14, color: '#1e293b' }}>
              {result.email.subject}
            </div>
            <label style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Body</label>
            <textarea
              readOnly
              value={result.email.body}
              style={{ width: '100%', minHeight: 220, marginTop: 4, padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit', color: '#334155' }}
            />
            <button onClick={() => copy(emailText, 'email')} style={copyBtn}>
              {copied === 'email' ? '✓ Copied' : '📋 Copy email'}
            </button>
          </div>
        )}

        {result && !loading && tab === 'linkedin' && (
          <div>
            <textarea
              readOnly
              value={result.linkedin.body}
              style={{ width: '100%', minHeight: 160, marginTop: 4, padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 14, lineHeight: 1.6, resize: 'vertical', fontFamily: 'inherit', color: '#334155' }}
            />
            <button onClick={() => copy(linkedinText, 'linkedin')} style={copyBtn}>
              {copied === 'linkedin' ? '✓ Copied' : '📋 Copy message'}
            </button>
          </div>
        )}

        {result && !loading && (
          <p style={{ marginTop: 16, fontSize: 12, color: '#94a3b8' }}>
            {result.usedAI ? '✨ AI-drafted — review and personalize before sending.' : 'Template draft — add a strong AI key for richer, tailored copy.'}
          </p>
        )}
      </div>
    </div>
  );
}

const copyBtn = {
  marginTop: 12,
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  color: 'white',
  border: 'none',
  padding: '10px 18px',
  borderRadius: 10,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
};
