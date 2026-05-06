import React, { useEffect, useRef } from 'react';

const TICKER_ITEMS = ['GitHub Verified', 'Zero Pretense', 'Proof Not Promise', 'Real Commits Only', 'Llama 3 Powered', 'Evidence First'];

const Landing = ({ setView }) => {
  const counterRef = useRef(null);

  useEffect(() => {
    const els = counterRef.current?.querySelectorAll('[data-target]');
    if (!els) return;
    els.forEach((el) => {
      const target = parseInt(el.dataset.target.replace(/,/g, ''));
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
    <div style={{ background: 'var(--bg)' }}>
      {/* ── Hero ── */}
      <section style={{ padding: '80px 0 120px 0' }}>
        <div className="container">
          <div className="anim-slide" style={{ textAlign: 'center', marginBottom: '64px' }}>
            <p className="label mb-4" style={{ letterSpacing: '0.3em' }}>
              ◆ THE MODERN TALENT VERIFICATION PLATFORM
            </p>
            <h1 style={{ margin: '0 auto 24px auto', maxWidth: '800px', fontSize: '3.5rem' }}>
              Hire on <span style={{ color: 'var(--accent)' }}>Proof</span>.<br />
              Not Empty Promises.
            </h1>
            <p style={{ fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 40px auto', lineHeight: 1.6 }}>
              ProofHire cross-references every resume claim against real GitHub commits, projects, and contributions. We surface who actually built things.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => setView('login-candidate')} style={{ padding: '14px 32px' }}>
                Apply as Candidate
              </button>
              <button className="btn btn-outline" onClick={() => setView('login-recruiter')} style={{ padding: '14px 32px' }}>
                Recruiter Access
              </button>
            </div>
          </div>

          <div ref={counterRef} className="stat-grid" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            {[
              { target: '2,400', suffix: '+', label: 'Verified Candidates' },
              { target: '94', suffix: '%', label: 'Match Accuracy' },
              { target: '180', suffix: '+', label: 'Companies Hiring' },
            ].map((s, i) => (
              <div key={i} className="stat-card" style={{ textAlign: 'center' }}>
                <span className="stat-value" data-target={s.target} data-suffix={s.suffix}>0</span>
                <span className="stat-title">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Ticker ── */}
      <div className="ticker">
        <div style={{ display: 'flex', whiteSpace: 'nowrap', animation: 'ticker 30s linear infinite' }}>
          {[...TICKER_ITEMS, ...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} style={{ padding: '0 40px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              {item} <span style={{ opacity: 0.3, marginLeft: '40px' }}>/</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── How it Works ── */}
      <section style={{ padding: '120px 0', background: 'var(--surface)' }}>
        <div className="container">
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '64px' }}>
            <div>
              <h2 className="mb-2">How it works.</h2>
              <p style={{ maxWidth: '400px' }}>We use Llama 3.3 and D3.js to visualize the gap between requirements and reality.</p>
            </div>
            <p className="label" style={{ opacity: 0.6 }}>Three steps. No fluff.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '32px' }}>
            {[
              { n: '01', title: 'Upload Resume', body: 'Candidates drop their PDF. AI extracts skills, CGPA, GitHub handles, and project URLs automatically.' },
              { n: '02', title: 'GitHub Evidence', body: 'We scrape commits, PRs, and language breakdowns from public repos. Every claim gets a source.' },
              { n: '03', title: 'Skill Verification', body: 'A weighted algorithm compares job requirements against real evidence. Recruiters see a match score, not a guess.' },
            ].map((step) => (
              <div key={step.n} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8rem', color: 'var(--accent)', fontWeight: 600, marginBottom: '24px' }}>{step.n}</div>
                <h3 className="mb-4">{step.title}</h3>
                <p style={{ lineHeight: 1.6 }}>{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes ticker {
          0% { transform: translateX(0); }
          100% { transform: translateX(-33.33%); }
        }
      `}} />
    </div>
  );
};

export default Landing;
