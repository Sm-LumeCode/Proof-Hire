import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

const Login = ({ role, onBack }) => {
  const { setCurrentUser } = useApp();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [sliding, setSliding] = useState(false);
  const [slideDir, setSlideDir] = useState('');
  const [form, setForm] = useState({ name: '', email: '', code: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isRecruiter = role === 'recruiter';

  const switchMode = (next) => {
    if (next === mode) return;
    setSlideDir(next === 'signup' ? 'left' : 'right');
    setSliding(true);
    setError('');
    setTimeout(() => {
      setMode(next);
      setSliding(false);
    }, 220);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise(r => setTimeout(r, 350));

    if (isRecruiter && form.code !== 'qwerty') {
      setError('Invalid referral code.');
      setLoading(false);
      return;
    }
    setCurrentUser({ name: form.name, email: form.email, role });
    setLoading(false);
  };

  const leftCopy = {
    recruiter: {
      label: 'Recruiter Access',
      heading: 'Find who actually built it.',
      body: 'Post roles, review GitHub-verified applicants, and make decisions backed by real evidence — not self-reported skills.',
    },
    candidate: {
      label: 'Candidate Access',
      heading: 'Let your commits speak.',
      body: 'Upload your resume. We verify your skills against your public GitHub activity so your work does the talking.',
    },
  };

  const copy = leftCopy[role];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '420px 1fr', minHeight: 'calc(100vh - 64px - 73px)' }}>
      {/* ── Left dark panel ── */}
      <div style={{ background: '#0a0a0a', padding: '56px 48px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <button onClick={onBack} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem',
            letterSpacing: '0.1em', textTransform: 'uppercase', color: '#444',
            marginBottom: '48px', display: 'flex', alignItems: 'center', gap: '6px', padding: 0
          }}>← Back</button>

          <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.18em', textTransform: 'uppercase', color: '#444', marginBottom: '20px' }}>
            ◆ {copy.label}
          </p>

          <h2 style={{ color: '#fff', fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em', marginBottom: '20px', maxWidth: '300px' }}>
            {copy.heading}
          </h2>

          <p style={{ color: '#555', fontSize: '0.875rem', lineHeight: 1.7, maxWidth: '300px' }}>
            {copy.body}
          </p>
        </div>

        {isRecruiter && (
          <div style={{ borderTop: '1px solid #1c1c1c', paddingTop: '24px' }}>
            <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#444', marginBottom: '8px' }}>
              Referral required
            </p>
            <p style={{ color: '#3a3a3a', fontSize: '0.8rem', lineHeight: 1.6 }}>
              Recruiter access is invite-only. Contact us at hello@proofhire.com for a code.
            </p>
          </div>
        )}
      </div>

      {/* ── Right form panel ── */}
      <div style={{ background: '#f4f1ed', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 60px' }}>
        <div style={{ width: '100%', maxWidth: '380px' }}>

          {/* Tab switcher */}
          <div style={{ display: 'flex', borderBottom: '1px solid #d8d5d0', marginBottom: '36px' }}>
            {['signin', 'signup'].map(m => (
              <button key={m} onClick={() => switchMode(m)} style={{
                flex: 1, padding: '10px 0', background: 'none', border: 'none',
                borderBottom: `2px solid ${mode === m ? '#0a0a0a' : 'transparent'}`,
                marginBottom: '-1px', cursor: 'pointer',
                fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.7rem',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                color: mode === m ? '#0a0a0a' : '#aaa',
                transition: 'color 150ms, border-color 150ms'
              }}>
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          {/* Animated form area */}
          <div style={{
            overflow: 'hidden',
            transition: 'opacity 220ms, transform 220ms',
            opacity: sliding ? 0 : 1,
            transform: sliding ? `translateX(${slideDir === 'left' ? '-24px' : '24px'})` : 'translateX(0)',
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '6px', letterSpacing: '-0.01em' }}>
              {mode === 'signin' ? 'Welcome back' : 'Create account'}
            </h3>
            <p style={{ fontSize: '0.8rem', color: '#888', marginBottom: '28px' }}>
              {mode === 'signin'
                ? `Sign in to your ${isRecruiter ? 'recruiter' : 'candidate'} account.`
                : `New to ProofHire? Get started below.`}
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '6px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="Your full name"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  required
                  style={{ fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '6px' }}>
                  Email
                </label>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                  style={{ fontSize: '0.9rem' }}
                />
              </div>

              {isRecruiter && (
                <div>
                  <label style={{ display: 'block', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888', marginBottom: '6px' }}>
                    Referral Code
                  </label>
                  <input
                    type="password"
                    placeholder="••••••"
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value })}
                    required
                    style={{ fontSize: '0.9rem' }}
                  />
                </div>
              )}

              {error && (
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.72rem', color: '#e63232', background: '#fff0f0', borderLeft: '2px solid #e63232', padding: '10px 12px' }}>
                  {error}
                </div>
              )}

              <button type="submit" disabled={loading} style={{
                marginTop: '4px', width: '100%', padding: '13px',
                fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.7rem',
                letterSpacing: '0.1em', textTransform: 'uppercase',
                background: '#0a0a0a', color: '#fff', border: 'none',
                cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.6 : 1,
                transition: 'opacity 150ms'
              }}>
                {loading ? 'Verifying…' : mode === 'signin' ? 'Sign In →' : 'Create Account →'}
              </button>

              <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#aaa', marginTop: '4px' }}>
                {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
                <button type="button" onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '0.75rem', color: '#0a0a0a', textDecoration: 'underline', padding: 0
                }}>
                  {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
