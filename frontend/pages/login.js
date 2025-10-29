import { useState } from 'react';
import { login, saveToken, saveUser } from '../lib/api';
import { useRouter } from 'next/router';

export default function LoginPage(){
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function onSubmit(e){
    e.preventDefault();
    setLoading(true);
    const res = await login({ email, password });
    if (res.token) {
      saveToken(res.token);
      saveUser(res.user);
      router.push('/dashboard');
    } else {
      alert(res.error || 'Login failed');
    }
    setLoading(false);
  }

  return (
    <div className="container">
      <h1>Login</h1>
      <form onSubmit={onSubmit} className="card">
        <label>Email</label>
        <input value={email} onChange={e=>setEmail(e.target.value)} type="email" required />
        <label>Password</label>
        <input value={password} onChange={e=>setPassword(e.target.value)} type="password" required />
        <div style={{marginTop:12}}>
          <button disabled={loading}>{loading? 'Working...':'Sign in'}</button>
        </div>
      </form>
    </div>
  );
}
