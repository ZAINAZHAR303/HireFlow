import { useEffect, useState } from 'react';
import { getAtsScore, getToken } from '../lib/api';

function scoreColor(score) {
  if (score >= 75) return '#059669';
  if (score >= 50) return '#d97706';
  return '#dc2626';
}

function scoreLabel(score) {
  if (score >= 75) return 'Strong match';
  if (score >= 50) return 'Needs tuning';
  return 'Low match';
}

export default function AtsScoreModal({ job, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError('');
      try {
        const token = getToken();
        const payload = {
          jobDescription: (job.description || '').replace(/<[^>]+>/g, ' '),
          jobTitle: job.title,
        };
        const data = await getAtsScore(token, payload);
        if (cancelled) return;
        if (data.error) setError(data.error);
        else setResult(data);
      } catch (e) {
        if (!cancelled) setError('Failed to analyze resume. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [job]);

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
        padding: '20px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '16px',
          maxWidth: '560px',
          width: '100%',
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: '28px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 22, color: '#1e293b' }}>ATS Resume Check</h2>
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

        {loading && (
          <div style={{ padding: '40px 0', textAlign: 'center', color: '#64748b' }}>
            Analyzing your resume against this job…
          </div>
        )}

        {error && !loading && (
          <div style={{ padding: '20px', background: '#fef2f2', borderRadius: 12, color: '#b91c1c', fontSize: 14 }}>
            {error}
          </div>
        )}

        {result && !loading && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, margin: '16px 0 24px' }}>
              <div
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: '50%',
                  border: `8px solid ${scoreColor(result.atsScore)}`,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <span style={{ fontSize: 28, fontWeight: 'bold', color: scoreColor(result.atsScore) }}>
                  {result.atsScore}
                </span>
                <span style={{ fontSize: 11, color: '#94a3b8' }}>/ 100</span>
              </div>
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: scoreColor(result.atsScore) }}>
                  {scoreLabel(result.atsScore)}
                </div>
                <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>
                  {result.matchedKeywords.length} of {result.totalKeywords} job keywords found in your resume.
                </div>
              </div>
            </div>

            <KeywordSection
              title="✅ Keywords you have"
              color="#059669"
              bg="#f0fdf4"
              items={result.matchedKeywords}
              empty="None detected yet."
            />
            <KeywordSection
              title="⚠️ Missing keywords"
              color="#b45309"
              bg="#fffbeb"
              items={result.missingKeywords}
              highlight={result.requiredMissing}
              empty="Nothing major missing — nice!"
            />

            {result.suggestions?.length > 0 && (
              <div style={{ marginTop: 20 }}>
                <h4 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: 15 }}>💡 Suggestions</h4>
                <ul style={{ margin: 0, paddingLeft: 20, color: '#334155', fontSize: 14, lineHeight: 1.6 }}>
                  {result.suggestions.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}

            <p style={{ marginTop: 20, fontSize: 12, color: '#94a3b8' }}>
              Required keywords are shown in bold. Only add skills you genuinely have.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function KeywordSection({ title, color, bg, items, highlight = [], empty }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h4 style={{ margin: '0 0 8px', color: '#1e293b', fontSize: 15 }}>{title}</h4>
      {items.length === 0 ? (
        <p style={{ margin: 0, color: '#94a3b8', fontSize: 14 }}>{empty}</p>
      ) : (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {items.map((kw) => {
            const isRequired = highlight.includes(kw);
            return (
              <span
                key={kw}
                style={{
                  padding: '4px 12px',
                  borderRadius: 16,
                  fontSize: 13,
                  background: bg,
                  color,
                  border: `1px solid ${color}33`,
                  fontWeight: isRequired ? 700 : 500,
                }}
              >
                {kw}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
