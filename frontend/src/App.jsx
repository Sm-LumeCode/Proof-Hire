import React, { useState, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Nav, Sidebar } from './components/UIComponents';
import Landing from './pages/Landing';
import RecruiterPortal from './pages/RecruiterPortal';
import CandidatePortal from './pages/CandidatePortal';
import Login from './pages/Login';
import SkillGraphPage from './pages/SkillGraphPage';
import './index.css';

function AppContent() {
  const [view, setView] = useState('landing');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { currentUser, logout } = useApp();
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    if (currentUser) {
      if (currentUser.role === 'recruiter' && (view === 'landing' || view === 'login-recruiter')) {
        setView('recruiter');
      }
      if (currentUser.role === 'candidate' && (view === 'landing' || view === 'login-candidate')) {
        setView('candidate');
      }
    }
  }, [currentUser, view]);

  const handleViewGraph = (app) => {
    setSelectedApp(app);
    setView('skill-graph');
  };

  const handleLogout = () => {
    logout();
    setView('landing');
  };

  const isPortal = currentUser && (
    view.startsWith('recruiter') || 
    view.startsWith('candidate') || 
    view === 'skill-graph'
  );

  return (
    <div className="app-layout">
      {isPortal && (
        <Sidebar 
          currentView={view} 
          setView={setView} 
          onLogout={handleLogout} 
          user={currentUser}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
      )}
      
      <div className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`} style={{
        ...(!isPortal ? { marginLeft: 0, padding: 0 } : {}),
        ...(view === 'skill-graph' ? { padding: 0 } : {})
      }}>
        {!isPortal && <Nav setView={setView} user={currentUser} />}
        
        <main>
          {view === 'landing' && <Landing setView={setView} />}
          {view === 'login-recruiter' && <Login role="recruiter" onBack={() => setView('landing')} />}
          {view === 'login-candidate' && <Login role="candidate" onBack={() => setView('landing')} />}
          
          {/* Portals */}
          {view.startsWith('recruiter') && (currentUser?.role === 'recruiter' ? <RecruiterPortal view={view} setView={setView} onViewGraph={handleViewGraph} /> : <Login role="recruiter" onBack={() => setView('landing')} />)}
          {view.startsWith('candidate') && (currentUser?.role === 'candidate' ? <CandidatePortal view={view} setView={setView} /> : <Login role="candidate" onBack={() => setView('landing')} />)}
          {view === 'skill-graph' && (currentUser ? <SkillGraphPage application={selectedApp} onBack={() => setView(currentUser.role === 'recruiter' ? 'recruiter-applications' : 'candidate-applications')} /> : <Login role="candidate" onBack={() => setView('landing')} />)}
        </main>

        {!isPortal && view === 'landing' && (
          <footer style={{
            borderTop: 'var(--border)',
            padding: '40px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'var(--surface)'
          }}>
            <span style={{ fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>
              Proof<span style={{ color: 'var(--accent)' }}>Hire</span>
            </span>
            <span className="label">© 2026 PROOFHIRE · ALL RIGHTS RESERVED</span>
          </footer>
        )}
      </div>
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
