import React from 'react';

export const Nav = ({ currentView, setView, onLogout, user }) => (
  <nav style={{
    position: 'sticky', top: 0, zIndex: 100,
    background: '#0a0a0a', borderBottom: '1px solid #222',
    height: '64px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', padding: '0 40px'
  }}>
    <button onClick={() => setView('landing')} style={{
      background: 'none', border: 'none', cursor: 'pointer',
      fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.25rem',
      color: '#fff', letterSpacing: '-0.03em'
    }}>
      Proof<span style={{ color: '#c8ff00' }}>Hire</span>
    </button>

    <div style={{ display: 'flex', align: 'center', gap: '8px' }}>
      {user ? (
        <>
          <button onClick={() => setView(user.role === 'recruiter' ? 'recruiter' : 'candidate')} className="tab-btn" style={{
            color: (currentView === 'recruiter' || currentView === 'candidate') ? '#c8ff00' : '#888',
            fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.1em',
            textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 16px'
          }}>Dashboard</button>

          <button onClick={() => setView('skill-graph')} style={{
            color: currentView === 'skill-graph' ? '#c8ff00' : '#888',
            fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem', letterSpacing: '0.1em',
            textTransform: 'uppercase', background: 'none', border: 'none', cursor: 'pointer',
            padding: '8px 16px'
          }}>Skill Graph</button>

          <div style={{ width: '1px', background: '#333', margin: '0 8px' }} />

          <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', color: '#555', letterSpacing: '0.08em', textTransform: 'uppercase', alignSelf: 'center' }}>
            {user.name} · <span style={{ color: '#c8ff00' }}>{user.role}</span>
          </div>

          <button onClick={onLogout} style={{
            marginLeft: '16px', padding: '8px 16px',
            fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.1em',
            textTransform: 'uppercase', background: 'none',
            border: '1px solid #333', color: '#888', cursor: 'pointer',
            transition: 'border-color 120ms, color 120ms'
          }}
            onMouseEnter={e => { e.target.style.borderColor = '#c8ff00'; e.target.style.color = '#c8ff00'; }}
            onMouseLeave={e => { e.target.style.borderColor = '#333'; e.target.style.color = '#888'; }}
          >Logout</button>
        </>
      ) : (
        <>
          <button onClick={() => setView('login-recruiter')} style={{
            padding: '8px 20px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem',
            letterSpacing: '0.1em', textTransform: 'uppercase', background: 'none',
            border: '1px solid #333', color: '#888', cursor: 'pointer',
            transition: 'border-color 120ms, color 120ms'
          }}
            onMouseEnter={e => { e.target.style.borderColor = '#fff'; e.target.style.color = '#fff'; }}
            onMouseLeave={e => { e.target.style.borderColor = '#333'; e.target.style.color = '#888'; }}
          >Recruiter</button>
          <button onClick={() => setView('login-candidate')} style={{
            padding: '8px 20px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.65rem',
            letterSpacing: '0.1em', textTransform: 'uppercase',
            background: '#c8ff00', border: '1px solid #c8ff00', color: '#0a0a0a',
            cursor: 'pointer', fontWeight: 700
          }}>Candidate</button>
        </>
      )}
    </div>
  </nav>
);

export const Tag = ({ children, variant = 'default' }) => {
  const vars = {
    default: { background: '#fff', color: '#0a0a0a', border: '1px solid #0a0a0a' },
    filled:  { background: '#0a0a0a', color: '#fff', border: '1px solid #0a0a0a' },
    lime:    { background: '#c8ff00', color: '#0a0a0a', border: '1px solid #c8ff00' },
    red:     { background: '#fff', color: '#e63232', border: '1px solid #e63232' },
    green:   { background: '#fff', color: '#00b368', border: '1px solid #00b368' },
  };
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', margin: '3px 3px 3px 0',
      fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.62rem',
      fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase',
      ...vars[variant]
    }}>{children}</span>
  );
};

export const StatusBadge = ({ status }) => {
  const map = { PENDING: 'default', HIRED: 'green', REJECTED: 'red' };
  return <Tag variant={map[status] || 'default'}>{status}</Tag>;
};

export const StatBlock = ({ num, label, accent }) => (
  <div style={{
    padding: '20px 24px', border: '1px solid #0a0a0a',
    background: accent ? '#c8ff00' : '#f4f1ed', flex: 1
  }}>
    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '2rem', fontWeight: 700, lineHeight: 1 }}>{num}</div>
    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#666', marginTop: '6px' }}>{label}</div>
  </div>
);
