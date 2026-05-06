import React, { createContext, useState, useContext, useEffect } from 'react';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [jobs, setJobs] = useState([
    {
      id: 1,
      title: "Senior Frontend Engineer",
      requiredSkills: ["React", "TypeScript", "D3.js", "CSS"],
      postedAt: new Date().toISOString(),
      applicantCount: 0
    },
    {
      id: 2,
      title: "Backend Developer",
      requiredSkills: ["Python", "FastAPI", "PostgreSQL", "Docker"],
      postedAt: new Date().toISOString(),
      applicantCount: 0
    }
  ]);

  const [applications, setApplications] = useState([]);
  const [users, setUsers] = useState(() => {
    try {
      const saved = localStorage.getItem('proofhire_all_users');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('proofhire_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  useEffect(() => {
    localStorage.setItem('proofhire_all_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('proofhire_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('proofhire_user');
    }
  }, [currentUser]);

  const signup = (userData) => {
    const newUser = { ...userData, id: Date.now() };
    setUsers(prev => [...prev, newUser]);
    setCurrentUser(newUser);
    return newUser;
  };

  const login = (email, role) => {
    const user = users.find(u => u.email === email && u.role === role);
    if (user) {
      setCurrentUser(user);
      return user;
    }
    return null;
  };

  const logout = () => {
    setCurrentUser(null);
  };

  const addJob = (job) => {
    setJobs(prev => [...prev, { ...job, id: Date.now(), postedAt: new Date().toISOString(), applicantCount: 0 }]);
  };

  const addApplication = (app) => {
    setApplications(prev => [...prev, { ...app, id: Date.now(), status: 'PENDING', date: new Date().toISOString() }]);
    setJobs(prev => prev.map(j => j.id === app.jobId ? { ...j, applicantCount: j.applicantCount + 1 } : j));
  };

  const updateApplicationStatus = (appId, status) => {
    setApplications(prev => prev.map(app => app.id === appId ? { ...app, status } : app));
  };

  return (
    <AppContext.Provider value={{
      jobs, addJob,
      applications, addApplication, updateApplicationStatus,
      currentUser, signup, login, logout,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
