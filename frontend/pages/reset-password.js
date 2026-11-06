import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { updatePassword, getSessionUser } from '../lib/api';

export default function ResetPassword() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('');
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);

  // Supabase puts the user in a recovery session when they arrive from the
  // emailed link; the browser client picks it up from the URL automatically.
  useEffect(() => {
    (async () => {
      const user = await getSessionUser();
      setReady(!!user);
      if (!user) setStatus('This reset link is invalid or has expired. Request a new one.');
    })();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    if (password.length < 8) return setStatus('Password must be at least 8 characters.');
    if (password !== confirm) return setStatus('Passwords do not match.');
    setLoading(true);
    setStatus('');
    const res = await updatePassword(password);
    setLoading(false);
    if (res.error) return setStatus(res.error);
    setStatus('Password updated! Redirecting to your dashboard…');
    setTimeout(() => router.push('/dashboard'), 1200);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 16, padding: 32, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h1 style={{ margin: 0, fontSize: 24, color: '#1e293b' }}>Set a new password</h1>
        <form onSubmit={onSubmit} style={{ marginTop: 20 }}>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password" disabled={!ready}
            style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, marginBottom: 12, boxSizing: 'border-box' }} />
          <input type="password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm new password" disabled={!ready}
            style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, marginBottom: 14, boxSizing: 'border-box' }} />
          <button type="submit" disabled={loading || !ready} style={{ width: '100%', padding: 14, border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, fontSize: 15, cursor: (loading || !ready) ? 'not-allowed' : 'pointer', background: (loading || !ready) ? '#94a3b8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>
        {status && <p style={{ marginTop: 14, fontSize: 14, color: '#334155' }}>{status}</p>}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/login" style={{ color: '#667eea', fontSize: 14, textDecoration: 'none' }}>← Back to sign in</a>
        </div>
      </div>
    </div>
  );
}
