import React, { useState } from 'react';

// Icons as simple SVGs
const Icons = {
  Dashboard: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
  ),
  SkillGraph: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M2 12h20M12 2l-3 3M12 2l3 3M12 22l-3-3M12 22l3-3M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l3 3"/></svg>
  ),
  Users: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  ),
  Logout: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
  ),
  ChevronLeft: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
  ),
  ChevronRight: () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
  ),
  Briefcase: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
  ),
  PlusCircle: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
  ),
  Menu: () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#5B8266" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
  )
};

export const Sidebar = ({ currentView, setView, onLogout, user, collapsed, setCollapsed }) => {
  if (!user) return null;

  const menuItems = user.role === 'recruiter' ? [
    { id: 'recruiter', label: 'Dashboard', icon: <Icons.Dashboard /> },
    { id: 'recruiter-applications', label: 'Applicants', icon: <Icons.Users /> },
    { id: 'recruiter-post', label: 'Post New Role', icon: <Icons.PlusCircle /> },
    { id: 'skill-graph', label: 'Skill Graph', icon: <Icons.SkillGraph /> }
  ] : [
    { id: 'candidate', label: 'Dashboard', icon: <Icons.Dashboard /> },
    { id: 'candidate-applications', label: 'My Applications', icon: <Icons.Briefcase /> },
    { id: 'skill-graph', label: 'Skill Graph', icon: <Icons.SkillGraph /> }
  ];

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header" style={{ justifyContent: collapsed ? 'center' : 'space-between' }}>
        {!collapsed && <div className="sidebar-logo">Proof<span>Hire</span></div>}
        <button 
          onClick={() => setCollapsed(!collapsed)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}
        >
          <Icons.Menu />
        </button>
      </div>

      <nav className="sidebar-nav">
        <div className="sidebar-label label" style={{ opacity: collapsed ? 0 : 1 }}>Menu</div>
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`sidebar-item ${currentView === item.id ? 'active' : ''}`}
            title={collapsed ? item.label : ''}
          >
            <i>{item.icon}</i>
            {!collapsed && <span>{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer" style={{ padding: 0 }}>
        {!collapsed && (
          <div style={{ padding: '24px 24px 8px 24px' }}>
            <div className="label" style={{ fontSize: '0.6rem' }}>User</div>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--primary)' }}>{user.name}</div>
            <div className="tag tag-filled" style={{ fontSize: '0.55rem', marginTop: '4px' }}>{user.role}</div>
          </div>
        )}
        <button 
          onClick={onLogout} 
          className="sidebar-item" 
          style={{ borderLeft: 'none', borderRight: 'none' }}
        >
          <i><Icons.Logout /></i>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export const Nav = ({ setView, user }) => (
  <nav style={{
    position: 'sticky', top: 0, zIndex: 100,
    background: 'var(--bg)', borderBottom: 'var(--border)',
    height: 'var(--nav-height)', display: 'flex', alignItems: 'center',
    padding: '0 32px', width: '100%'
  }}>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
      <div 
        onClick={() => setView('landing')} 
        style={{ cursor: 'pointer', fontFamily: 'Plus Jakarta Sans, sans-serif', fontWeight: 800, fontSize: '1.25rem', color: 'var(--primary)' }}
      >
        Proof<span style={{ color: 'var(--accent)' }}>Hire</span>
      </div>

      <div style={{ display: 'flex', gap: '12px' }}>
        {!user && (
          <>
            <button onClick={() => setView('login-recruiter')} className="btn btn-outline" style={{ fontSize: '0.75rem' }}>Recruiter Portal</button>
            <button onClick={() => setView('login-candidate')} className="btn btn-primary" style={{ fontSize: '0.75rem' }}>Candidate Portal</button>
          </>
        )}
      </div>
    </div>
  </nav>
);

export const Tag = ({ children, variant = 'default' }) => {
  const classMap = {
    default: 'tag',
    filled: 'tag tag-filled',
    accent: 'tag tag-accent',
    red: 'tag tag-red',
    green: 'tag tag-green'
  };
  
  // Custom inline styles for variants that might not be in CSS yet
  const getStyle = () => {
    if (variant === 'green') return { borderColor: 'var(--success)', color: 'var(--success)' };
    if (variant === 'red') return { borderColor: 'var(--error)', color: 'var(--error)' };
    return {};
  };

  return (
    <span className={classMap[variant] || 'tag'} style={getStyle()}>
      {children}
    </span>
  );
};

export const StatusBadge = ({ status }) => {
  const map = { PENDING: 'default', HIRED: 'green', REJECTED: 'red' };
  return <Tag variant={map[status] || 'default'}>{status}</Tag>;
};

export const StatBlock = ({ num, label, accent }) => (
  <div className="stat-card" style={accent ? { background: 'var(--surface)', borderLeft: '4px solid var(--primary)' } : {}}>
    <span className="stat-value">{num}</span>
    <span className="stat-title">{label}</span>
  </div>
);

export const Card = ({ title, children, subtitle }) => (
  <div className="card">
    {title && (
      <div className="mb-4">
        <h3 className="mb-1">{title}</h3>
        {subtitle && <p className="label">{subtitle}</p>}
      </div>
    )}
    {children}
  </div>
);

export const Tabs = ({ tabs, activeTab, onTabChange }) => (
  <div className="tabs-nav">
    {tabs.map(tab => (
      <div 
        key={tab.id} 
        className={`tab-link ${activeTab === tab.id ? 'active' : ''}`}
        onClick={() => onTabChange(tab.id)}
      >
        {tab.label}
      </div>
    ))}
  </div>
);
