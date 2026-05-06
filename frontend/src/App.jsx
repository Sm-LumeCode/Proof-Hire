import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Nav } from './components/UIComponents';
import Landing from './pages/Landing';
import RecruiterPortal from './pages/RecruiterPortal';
import CandidatePortal from './pages/CandidatePortal';
import Login from './pages/Login';
import SkillGraphPage from './pages/SkillGraphPage';
import './index.css';

function AppContent() {
  const [view, setView] = useState('landing');
  const { currentUser, logout } = useApp();

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'recruiter') setView('recruiter');
      if (currentUser.role === 'candidate') setView('candidate');
    }
  }, [currentUser]);

  const handleLogout = () => {
    logout();
    setView('landing');
  };

  return (
    <div className="app-container">
      <Nav currentView={view} setView={setView} onLogout={handleLogout} user={currentUser} />
      
      <main>
        {view === 'landing' && <Landing setView={setView} />}
        {view === 'login-recruiter' && <Login role="recruiter" onBack={() => setView('landing')} />}
        {view === 'login-candidate' && <Login role="candidate" onBack={() => setView('landing')} />}
        {view === 'recruiter' && (currentUser?.role === 'recruiter' ? <RecruiterPortal /> : <Login role="recruiter" onBack={() => setView('landing')} />)}
        {view === 'candidate' && (currentUser?.role === 'candidate' ? <CandidatePortal /> : <Login role="candidate" onBack={() => setView('landing')} />)}
        {view === 'skill-graph' && (currentUser ? <SkillGraphPage /> : <Login role="candidate" onBack={() => setView('landing')} />)}
      </main>

      {view !== 'skill-graph' && (
        <footer style={{
          borderTop: '1px solid #0a0a0a',
          padding: '32px 40px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1rem', letterSpacing: '-0.02em' }}>
            Proof<span style={{ color: '#888' }}>Hire</span>
          </span>
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.6rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#888' }}>© 2026 PROOFHIRE · ALL RIGHTS RESERVED</span>
        </footer>
      )}
    </div>
  );
}

function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}

export default App;
