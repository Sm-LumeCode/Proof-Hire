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

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem('proofhire_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  useEffect(() => {
    if (currentUser) {
      sessionStorage.setItem('proofhire_user', JSON.stringify(currentUser));
    } else {
      sessionStorage.removeItem('proofhire_user');
    }
  }, [currentUser]);

  const logout = () => {
    setCurrentUser(null);
    sessionStorage.removeItem('proofhire_user');
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
      currentUser, setCurrentUser, logout,
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
