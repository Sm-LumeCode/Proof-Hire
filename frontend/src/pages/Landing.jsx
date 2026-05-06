import React, { useEffect, useRef } from 'react';

const TICKER_ITEMS = ['GitHub Verified', 'Zero Pretense', 'Proof Not Promise', 'Real Commits Only', 'Llama 3 Powered', 'Evidence First'];

const Landing = ({ setView }) => {
  const counterRef = useRef(null);

  useEffect(() => {
    // Subtle number count-up for stats
    const targets = [2400, 94, 180];
    const els = counterRef.current?.querySelectorAll('[data-target]');
    if (!els) return;
    els.forEach((el) => {
      const target = parseInt(el.dataset.target);
      let current = 0;
      const step = Math.ceil(target / 60);
      const interval = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current.toLocaleString() + (el.dataset.suffix || '');
        if (current >= target) clearInterval(interval);
      }, 16);
    });
  }, []);

  return (
    <div>
      {/* ── Hero ── */}
      <div style={{ background: '#0a0a0a', color: '#fff', paddingBottom: '0' }}>
        <div className="container" style={{ paddingTop: '72px', paddingBottom: '60px' }}>
          <div className="anim-slide">
            <p className="label" style={{ color: '#555', marginBottom: '24px', letterSpacing: '0.2em' }}>
              ◆ TALENT VERIFICATION PLATFORM
            </p>
            <h1 style={{ color: '#fff', maxWidth: '720px', fontSize: 'clamp(2.2rem, 5vw, 4rem)', fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.03em' }}>
              Hire on Proof.<br />
              <span style={{ color: '#c8ff00' }}>Not Promise.</span>
            </h1>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', marginTop: '80px', alignItems: 'end' }}>
            <p className="anim-slide-2" style={{ fontSize: '1.1rem', color: '#999', lineHeight: 1.7, maxWidth: '480px' }}>
              ProofHire cross-references every resume claim against real GitHub commits, projects, and contributions. We surface who actually built things.
            </p>
            <div className="anim-slide-3" style={{ display: 'flex', gap: '16px' }}>
              <button className="btn btn-lime" onClick={() => setView('login-candidate')} style={{ flex: 1, justifyContent: 'center' }}>
                Apply as Candidate
              </button>
              <button className="btn btn-outline" onClick={() => setView('login-recruiter')} style={{ flex: 1, justifyContent: 'center', borderColor: '#333', color: '#aaa' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fff' && (e.currentTarget.style.color = '#000')}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#aaa'; }}
              >
                Recruiter Access
              </button>
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div ref={counterRef} style={{ borderTop: '1px solid #1a1a1a', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {[
            { target: '2,400', suffix: '+', label: 'Verified Candidates' },
            { target: '94', suffix: '%', label: 'Match Accuracy' },
            { target: '180', suffix: '+', label: 'Companies Hiring' },
          ].map((s, i) => (
            <div key={i} style={{ padding: '32px 40px', borderRight: i < 2 ? '1px solid #1a1a1a' : 'none' }}>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '2.2rem', fontWeight: 700, color: '#fff' }}>{s.target}</div>
              <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#555', marginTop: '8px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Ticker ── */}
      <div className="ticker-wrap">
        <div className="ticker-inner">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="ticker-item">
              {item} <span className="ticker-sep" style={{ marginLeft: '48px' }}>—</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── How it Works ── */}
      <div className="container" style={{ paddingTop: '100px', paddingBottom: '100px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '60px' }}>
          <h2>How it works.</h2>
          <p className="label">Three steps. No fluff.</p>
        </div>
        <hr className="rule-thick" style={{ marginBottom: '0' }} />

        {[
          { n: '01', title: 'Upload Resume', body: 'Candidates drop their PDF. Llama 3.3 extracts skills, CGPA, GitHub handles, and project URLs automatically.' },
          { n: '02', title: 'GitHub Evidence', body: 'We scrape commits, PRs, stars, and language breakdowns from public repos. Every claim gets a source.' },
          { n: '03', title: 'Skill Verification', body: 'A weighted overlap algorithm compares job requirements against real evidence. Recruiters see a match score, not a guess.' },
        ].map((step) => (
          <div key={step.n} style={{ display: 'grid', gridTemplateColumns: '80px 1fr 1fr', gap: '40px', padding: '48px 0', borderBottom: '1px solid #0a0a0a', alignItems: 'start' }}>
            <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.12em', color: '#999', paddingTop: '4px' }}>{step.n}</div>
            <h3>{step.title}</h3>
            <p style={{ color: '#555', lineHeight: 1.7 }}>{step.body}</p>
          </div>
        ))}
      </div>

      {/* ── CTA ── */}
      <div style={{ background: '#0a0a0a', color: '#fff' }}>
        <div className="container" style={{ paddingTop: '80px', paddingBottom: '80px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '40px' }}>
          <h2 style={{ color: '#fff' }}>Ready to verify<br />your first hire?</h2>
          <div style={{ display: 'flex', gap: '16px' }}>
            <button className="btn btn-lime" onClick={() => setView('login-recruiter')}>Post a Role →</button>
            <button className="btn" onClick={() => setView('login-candidate')} style={{ background: 'transparent', border: '1px solid #333', color: '#aaa' }}>Apply Now</button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Landing;
