import { useEffect, useState } from 'react';

// Infer a severity from the message text so existing alert() strings
// (often prefixed with ✅ / ❌) get sensible colors without code changes.
function inferType(msg) {
  const s = String(msg);
  if (/❌|\bfail|error|invalid|could not|couldn't|not found|too long|busy/i.test(s)) return 'error';
  if (/✅|success|saved|updated|added|resent|copied|uploaded|done/i.test(s)) return 'success';
  return 'info';
}

const BORDER = { error: '#dc2626', success: '#059669', info: '#667eea' };

export default function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    function onToast(e) {
      const t = { ...e.detail, type: e.detail.type || inferType(e.detail.message) };
      setToasts((prev) => [...prev, t]);
      setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== t.id)), 4000);
    }
    window.addEventListener('hf-toast', onToast);
    return () => window.removeEventListener('hf-toast', onToast);
  }, []);

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 2147483647, display: 'flex', flexDirection: 'column', gap: 8, maxWidth: '90vw' }}>
      {toasts.map((t) => (
        <div
          key={t.id}
          onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
          style={{
            background: 'white',
            borderLeft: `4px solid ${BORDER[t.type]}`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            borderRadius: 10,
            padding: '12px 16px',
            fontSize: 14,
            color: '#1e293b',
            cursor: 'pointer',
            maxWidth: 380,
            animation: 'hfToastIn 0.2s ease-out',
          }}
        >
          {t.message}
        </div>
      ))}
      <style jsx global>{`
        @keyframes hfToastIn { from { opacity: 0; transform: translateX(16px); } to { opacity: 1; transform: translateX(0); } }
      `}</style>
    </div>
  );
}
