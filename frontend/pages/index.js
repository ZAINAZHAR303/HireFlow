import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getToken } from '../lib/api';

export default function Home(){
  return (
    <div className="container">
      <h1>Hireflow — Phase 1 demo</h1>
      <p className="muted">Signup, upload a resume, and see job matches from Remotive filtered by your skills.</p>
      <div style={{display:'flex', gap:12, marginTop:16}}>
        <Link href="/signup"><button>Create account</button></Link>
        <Link href="/login"><button style={{background:'#666'}}>Sign in</button></Link>
      </div>
    </div>
  );
}
