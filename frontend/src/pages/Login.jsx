import React, { useState } from 'react';
import { useApp } from '../context/AppContext';

const Login = ({ role, onBack }) => {
  const { signup, login } = useApp();
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
    
    // Simulate network delay
    await new Promise(r => setTimeout(r, 600));

    try {
      if (mode === 'signup') {
        if (isRecruiter && form.code !== 'qwerty') {
          throw new Error('Invalid referral code.');
        }
        signup({ name: form.name, email: form.email, role });
      } else {
        const user = login(form.email, role);
        if (!user) {
          throw new Error('User not found. Please sign up first.');
        }
      }
    } catch (err) {
      setError(err.message);
      setLoading(false);
      return;
    }

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
    <div className="login-wrapper" style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', minHeight: 'calc(100vh - 72px)' }}>
      {/* ── Left panel ── */}
      <div className="login-info-panel" style={{ background: 'var(--surface)', padding: '60px', display: 'flex', flexDirection: 'column', borderRight: 'var(--border)' }}>
        <button onClick={onBack} className="btn btn-outline mb-4" style={{ alignSelf: 'flex-start', padding: '6px 12px', fontSize: '0.7rem' }}>
          ← Back to Site
        </button>

        <div style={{ marginTop: '40px' }}>
          <p className="label mb-4" style={{ letterSpacing: '0.2em' }}>◆ {copy.label}</p>
          <h2 style={{ fontSize: '2rem', marginBottom: '24px', lineHeight: 1.2 }}>{copy.heading}</h2>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '320px' }}>{copy.body}</p>
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '40px', borderTop: 'var(--border)' }}>
          {isRecruiter ? (
            <div>
              <p className="label mb-2">Referral Required</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Recruiter access is currently invite-only. Contact our team for an access code.
              </p>
            </div>
          ) : (
            <div>
              <p className="label mb-2">Proof Not Promise</p>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Your code is your resume. We help you prove it to top companies.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{ background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px' }}>
        <div className="card" style={{ width: '100%', maxWidth: '400px', border: 'none', boxShadow: 'none' }}>
          
          {/* Tab switcher */}
          <div style={{ display: 'flex', borderBottom: 'var(--border)', marginBottom: '40px' }}>
            {['signin', 'signup'].map(m => (
              <button key={m} onClick={() => switchMode(m)} style={{
                flex: 1, padding: '12px 0', background: 'none', border: 'none',
                borderBottom: `2px solid ${mode === m ? 'var(--primary)' : 'transparent'}`,
                marginBottom: '-1px', cursor: 'pointer',
                fontFamily: 'Inter, sans-serif', fontSize: '0.85rem',
                fontWeight: 600,
                color: mode === m ? 'var(--primary)' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}>
                {m === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <div style={{
            transition: 'opacity 220ms, transform 220ms',
            opacity: sliding ? 0 : 1,
            transform: sliding ? `translateX(${slideDir === 'left' ? '-20px' : '20px'})` : 'translateX(0)',
          }}>
            <h3 className="mb-1">{mode === 'signin' ? 'Welcome back' : 'Create an account'}</h3>
            <p className="mb-8" style={{ fontSize: '0.9rem' }}>
              {mode === 'signin' 
                ? `Enter your ${role} credentials below.` 
                : 'Join the next generation of verified talent.'}
            </p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {mode === 'signup' && (
                <div>
                  <label className="label mb-2">Full Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Alex Chen"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
              )}

              <div>
                <label className="label mb-2">Email Address</label>
                <input
                  type="email"
                  placeholder="alex@example.com"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              {isRecruiter && (
                <div>
                  <label className="label mb-2">Access Code</label>
                  <input
                    type="password"
                    placeholder="Enter referral code (try 'qwerty')"
                    value={form.code}
                    onChange={e => setForm({ ...form, code: e.target.value })}
                    required
                  />
                </div>
              )}

              {error && <div className="error-strip" style={{ marginBottom: '8px' }}>{error}</div>}

              <button type="submit" className="btn btn-primary" disabled={loading} style={{ padding: '14px' }}>
                {loading ? 'Verifying...' : mode === 'signin' ? 'Sign In →' : 'Create Account →'}
              </button>

              <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                {mode === 'signin' ? "Don't have an account? " : 'Already registered? '}
                <span 
                  onClick={() => switchMode(mode === 'signin' ? 'signup' : 'signin')}
                  style={{ color: 'var(--primary)', fontWeight: 600, cursor: 'pointer', textDecoration: 'underline' }}
                >
                  {mode === 'signin' ? 'Sign Up' : 'Sign In'}
                </span>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
