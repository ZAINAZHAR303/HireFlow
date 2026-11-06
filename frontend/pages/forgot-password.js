import { useState } from 'react';
import { sendPasswordReset } from '../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setStatus('');
    const res = await sendPasswordReset(email);
    setStatus(res.error ? res.error : 'If an account exists for that email, a reset link is on its way.');
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420, background: 'white', borderRadius: 16, padding: 32, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <h1 style={{ margin: 0, fontSize: 24, color: '#1e293b' }}>Reset your password</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginTop: 8 }}>Enter your email and we'll send you a reset link.</p>
        <form onSubmit={onSubmit} style={{ marginTop: 20 }}>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            style={{ width: '100%', padding: '12px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 15, marginBottom: 14, boxSizing: 'border-box' }}
          />
          <button type="submit" disabled={loading} style={{ width: '100%', padding: 14, border: 'none', borderRadius: 12, color: 'white', fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', background: loading ? '#94a3b8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
            {loading ? 'Sending…' : 'Send reset link'}
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
