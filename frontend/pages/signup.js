import { useState } from 'react';
import { signup, saveToken, saveUser } from '../lib/api';
import { useRouter } from 'next/router';

export default function SignupPage(){
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e){
    e.preventDefault();
    setLoading(true);
    const body = { name, email, password };
    const res = await signup(body);
    if (res.token) {
      saveToken(res.token);
      saveUser(res.user);
      router.push('/dashboard');
    } else {
      alert(res.error || 'Signup failed');
    }
    setLoading(false);
  }

  return (
    <div className="container">
      <h1>Sign up</h1>
      <p className="muted">Create your account to start finding jobs</p>
      <form onSubmit={onSubmit} className="card">
        <label>Name *</label>
        <input value={name} onChange={e=>setName(e.target.value)} required />
        
        <label>Email *</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required />
        
        <label>Password *</label>
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" required />
        
        <div style={{marginTop:12}}>
          <button type="submit" disabled={loading}>{loading? 'Creating account...':'Create account'}</button>
        </div>
        <p className="muted" style={{marginTop: 12, textAlign: 'center'}}>
          Already have an account? <a href="/login" style={{color: '#0b5fff'}}>Sign in</a>
        </p>
      </form>
    </div>
  );
}
