import { useState } from 'react';
import { signIn, signInWithProvider, resendConfirmation } from '../lib/api';
import { useRouter } from 'next/router';

export default function LoginPage(){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  async function onSubmit(e){
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await signIn({ email, password });
    if (res.error) {
      setError(res.error || 'Login failed');
    } else {
      router.push('/dashboard');
    }
    setLoading(false);
  }

  async function onGoogle(){
    setError('');
    const res = await signInWithProvider('google');
    if (res.error) setError(res.error);
  }

  async function onResend(){
    const res = await resendConfirmation(email);
    setError(res.error ? res.error : 'Confirmation email resent — check your inbox.');
  }

  const needsConfirm = /confirm/i.test(error);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background shapes */}
      <div style={{
        position: 'absolute',
        top: '-20%',
        right: '-10%',
        width: '500px',
        height: '500px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%',
        animation: 'float 20s ease-in-out infinite'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-20%',
        left: '-10%',
        width: '400px',
        height: '400px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%',
        animation: 'float 15s ease-in-out infinite reverse'
      }} />

      <div style={{
        width: '100%',
        maxWidth: '480px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Logo/Brand */}
        <div style={{
          textAlign: 'center',
          marginBottom: '30px',
          animation: 'fadeInDown 0.6s ease-out'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '10px'
          }}>💼</div>
          <h1 style={{
            fontSize: '36px',
            fontWeight: 'bold',
            color: 'white',
            margin: 0
          }}>
            Welcome Back
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.9)',
            fontSize: '16px',
            marginTop: '8px'
          }}>
            Sign in to continue your job search
          </p>
        </div>

        {/* Login Form Card */}
        <div style={{
          background: 'white',
          borderRadius: '24px',
          padding: '40px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          animation: 'fadeInUp 0.6s ease-out 0.2s backwards'
        }}>
          <form onSubmit={onSubmit}>
            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#1e293b',
                fontWeight: '600',
                fontSize: '14px'
              }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                style={{
                  width: '100%',
                  padding: '14px 18px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '15px',
                  transition: 'all 0.3s ease',
                  outline: 'none',
                  background: '#f8fafc'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#667eea';
                  e.target.style.background = 'white';
                  e.target.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.background = '#f8fafc';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="you@example.com"
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{
                display: 'block',
                marginBottom: '8px',
                color: '#1e293b',
                fontWeight: '600',
                fontSize: '14px'
              }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '14px 50px 14px 18px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '15px',
                    transition: 'all 0.3s ease',
                    outline: 'none',
                    background: '#f8fafc'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#667eea';
                    e.target.style.background = 'white';
                    e.target.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.background = '#f8fafc';
                    e.target.style.boxShadow = 'none';
                  }}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '20px',
                    padding: '8px',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.opacity = '0.7'}
                  onMouseLeave={(e) => e.target.style.opacity = '1'}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                padding: '14px 18px',
                background: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '12px',
                color: '#dc2626',
                fontSize: '14px',
                marginBottom: '24px',
                animation: 'shake 0.5s ease-in-out'
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '16px',
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: loading ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)',
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                }
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <span style={{
                    width: '18px',
                    height: '18px',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  Signing In...
                </span>
              ) : (
                '🚀 Sign In'
              )}
            </button>
          </form>

          {needsConfirm && (
            <p style={{ textAlign: 'center', fontSize: 13, marginTop: 12 }}>
              <button type="button" onClick={onResend} style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', fontWeight: 600 }}>
                Resend confirmation email
              </button>
            </p>
          )}

          <div style={{ textAlign: 'center', marginTop: 12 }}>
            <a href="/forgot-password" style={{ color: '#64748b', fontSize: 13, textDecoration: 'none' }}>
              Forgot your password?
            </a>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '20px 0' }}>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            <span style={{ color: '#94a3b8', fontSize: 12 }}>OR</span>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          </div>

          <button
            type="button"
            onClick={onGoogle}
            style={{
              width: '100%',
              padding: '14px',
              background: 'white',
              border: '1.5px solid #e2e8f0',
              borderRadius: '12px',
              color: '#1e293b',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px'
            }}
          >
            <img src="https://www.google.com/favicon.ico" alt="" width="18" height="18" />
            Continue with Google
          </button>

          <div style={{
            marginTop: '24px',
            textAlign: 'center',
            padding: '20px 0',
            borderTop: '1px solid #e2e8f0'
          }}>
            <p style={{
              color: '#64748b',
              fontSize: '14px',
              margin: 0
            }}>
              Don't have an account?{' '}
              <a
                href="/signup"
                style={{
                  color: '#667eea',
                  fontWeight: '600',
                  textDecoration: 'none',
                  transition: 'color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.color = '#764ba2'}
                onMouseLeave={(e) => e.target.style.color = '#667eea'}
              >
                Create one →
              </a>
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div style={{
          textAlign: 'center',
          marginTop: '24px',
          animation: 'fadeIn 0.6s ease-out 0.4s backwards'
        }}>
          <a
            href="/"
            style={{
              color: 'white',
              textDecoration: 'none',
              fontSize: '14px',
              fontWeight: '500',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.opacity = '0.8'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            ← Back to Home
          </a>
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeInDown {
          from {
            opacity: 0;
            transform: translateY(-30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-30px);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
          20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
      `}</style>
    </div>
  );
}
