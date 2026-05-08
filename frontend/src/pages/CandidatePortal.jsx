import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Tag, StatusBadge, Tabs, Card } from '../components/UIComponents';
import { SkillGraph } from '../components/SkillGraph';
import { Roadmap } from '../components/Roadmap';

const STEP_LABELS = { 
  extracting: 'Parsing PDF with AI...', 
  fetching: 'Analyzing GitHub Evidence...', 
  done: 'Applied!' 
};

const ANALYSIS_MESSAGES = [
  'Extracting technical skills from resume...',
  'Connecting to GitHub profile...',
  'Scanning repositories for evidence...',
  'Analyzing contribution patterns...',
  'Mapping skill graph dependencies...',
  'Generating personalized AI roadmap...',
  'Calculating final fit score...'
];

const CandidatePortal = ({ view = 'candidate', setView }) => {
  const { jobs, addApplication, applications, currentUser } = useApp();
  const [applyingTo, setApplyingTo] = useState(null);
  const [expandedApp, setExpandedApp] = useState(null);
  const [activeTabs, setActiveTabs] = useState({}); // { appId: tabId }
  const [step, setStep] = useState(null);
  const [analysisMsgIndex, setAnalysisMsgIndex] = useState(0);
  const [error, setError] = useState('');

  // Cycle analysis messages
  React.useEffect(() => {
    let interval;
    if (step === 'extracting') {
      interval = setInterval(() => {
        setAnalysisMsgIndex(prev => (prev + 1) % ANALYSIS_MESSAGES.length);
      }, 2500);
    } else {
      setAnalysisMsgIndex(0);
    }
    return () => clearInterval(interval);
  }, [step]);

  const handleApply = async (e, jobId) => {
    e.preventDefault();
    const file = e.target.resume.files[0];
    if (!file) { setError('Please select a PDF.'); return; }
    setError('');

    const job = jobs.find(j => j.id === jobId);

    try {
      setStep('extracting');
      
      const formData = new FormData();
      formData.append('file', file);
      formData.append('jobId', jobId.toString());
      formData.append('jobTitle', job.title);
      formData.append('requiredSkills', JSON.stringify(job.requiredSkills));
      formData.append('githubUrl', e.target.githubUrl.value);

      const response = await fetch('http://127.0.0.1:8001/api/apply', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Failed to process application');
      }

      const data = await response.json();
      const { resumeData, githubData } = data;

      addApplication({ 
        jobId, 
        name: currentUser.name, 
        email: currentUser.email, 
        resumeData, 
        githubData 
      });

      setStep('done');
      setTimeout(() => { 
        setStep(null); 
        setApplyingTo(null); 
        if (setView) setView('candidate-applications'); 
      }, 1500);
    } catch (err) {
      setError(err.message);
      setStep(null);
    }
  };

  const setAppTab = (appId, tabId) => {
    setActiveTabs(prev => ({ ...prev, [appId]: tabId }));
  };

  const userApps = applications.filter(a => a.email === currentUser.email);

  return (
    <div>
      <header className="mb-4">
        <p className="label mb-1">Candidate Portal</p>
        <h2>Welcome, {currentUser.name.split(' ')[0]}.</h2>
        <p className="mono" style={{ fontSize: '0.75rem', opacity: 0.6 }}>{currentUser.email}</p>
      </header>

      {/* ── Dashboard (Open Roles) ── */}
      {view === 'candidate' && (
        <div className="anim-slide" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ marginBottom: '8px' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Available Opportunities</h3>
            <p className="label" style={{ textTransform: 'none' }}>Apply with your resume to see your skill match graph.</p>
          </div>
          {jobs.length === 0 ? (
            <Card><p className="label" style={{ textAlign: 'center' }}>No open roles at the moment.</p></Card>
          ) : jobs.map(job => (
            <div key={job.id}>
              <Card>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
                  <div>
                    <h3 className="mb-4">{job.title}</h3>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {job.requiredSkills.map(s => <Tag key={s}>{s}</Tag>)}
                    </div>
                  </div>
                  <button
                    className={`btn ${applyingTo === job.id ? 'btn-outline' : 'btn-primary'}`}
                    onClick={() => { setApplyingTo(applyingTo === job.id ? null : job.id); setError(''); setStep(null); }}
                  >
                    {applyingTo === job.id ? 'Cancel' : 'Apply Now →'}
                  </button>
                </div>
              </Card>

              {applyingTo === job.id && (
                <div className="anim-slide" style={{ marginTop: '4px' }}>
                  <Card style={{ background: 'var(--surface)', borderTop: 'none', borderTopLeftRadius: 0, borderTopRightRadius: 0 }}>
                    <p className="label mb-4">Complete your application</p>
                    <form onSubmit={(e) => handleApply(e, job.id)} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px' }}>
                      <div>
                        <label className="label mb-2">GitHub Profile URL</label>
                        <input name="githubUrl" type="url" placeholder="https://github.com/username" required style={{ background: 'var(--white)', width: '100%' }} />
                      </div>
                      <div>
                        <label className="label mb-2">Upload Resume (PDF)</label>
                        <input name="resume" type="file" accept=".pdf" required style={{ background: 'var(--white)' }} />
                        <p style={{ fontSize: '0.7rem', marginTop: '8px', color: 'var(--text-muted)' }}>
                          Our AI will extract your skills and evidence from your profile automatically.
                        </p>
                      </div>

                      {error && <div className="error-strip">{error}</div>}
                      {step === 'done' && <div className="success-strip">Application submitted! Redirecting...</div>}

                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={!!step && step !== 'done'}
                        style={{ alignSelf: 'flex-start' }}
                      >
                        {step ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span className="loader" /> 
                            {step === 'extracting' ? ANALYSIS_MESSAGES[analysisMsgIndex] : STEP_LABELS[step]}
                          </span>
                        ) : 'Submit Evidence →'}
                      </button>
                    </form>
                  </Card>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── My Applications ── */}
      {view === 'candidate-applications' && (
        <div className="anim-slide" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ marginBottom: '8px' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Your Applications</h3>
            <p className="label" style={{ textTransform: 'none' }}>Track your status and view your verified skill graph.</p>
          </div>
          {userApps.length === 0 ? (
            <Card>
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <p className="label mb-4">You haven't applied to any roles yet.</p>
                <button className="btn btn-primary" onClick={() => setView('candidate')}>Browse Open Roles</button>
              </div>
            </Card>
          ) : userApps.map(app => {
            const job = jobs.find(j => j.id === app.jobId);
            const isExpanded = expandedApp === app.id;
            const currentTab = activeTabs[app.id] || 'graph';
            
            return (
              <Card key={app.id} style={{ padding: isExpanded ? '0' : '20px' }}>
                <div 
                  onClick={() => setExpandedApp(isExpanded ? null : app.id)}
                  style={{ 
                    padding: isExpanded ? '24px 32px' : '0',
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <div>
                    <h3 className="mb-1" style={{ fontSize: '1.1rem' }}>{job?.title || 'Unknown Role'}</h3>
                    <div className="label" style={{ fontSize: '0.7rem' }}>
                      Applied {new Date(app.date || Date.now()).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    {app.githubData && (
                      <div className="mono" style={{ color: 'var(--primary)', fontWeight: 600, fontSize: '0.85rem' }}>
                        @{app.githubData.username}
                      </div>
                    )}
                    <StatusBadge status={app.status} />
                    <div className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '0.65rem' }}>
                      {isExpanded ? 'Close' : 'View Insights'}
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div style={{ borderTop: 'var(--border)', padding: '32px', background: 'var(--surface)' }}>
                    <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: 'var(--border)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '32px' }}>
                        {/* Skill Graph Area */}
                        <div>
                          <p className="label mb-3" style={{ fontSize: '0.65rem' }}>Skill Evidence Mapping</p>
                          {app.githubData?.graph ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                              <SkillGraph data={app.githubData} height="400px" name="Your" />
                              
                              {/* New: Technical Evidence Stats */}
                              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', background: 'rgba(56,163,165,0.05)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(56,163,165,0.1)' }}>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{app.githubData?.contributions?.total_commits || 0}</div>
                                  <div className="label" style={{ fontSize: '0.55rem', marginTop: '2px' }}>Your Commits</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{app.githubData?.total_stars || 0}</div>
                                  <div className="label" style={{ fontSize: '0.55rem', marginTop: '2px' }}>Total Stars</div>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>{app.githubData?.public_repos || 0}</div>
                                  <div className="label" style={{ fontSize: '0.55rem', marginTop: '2px' }}>Public Repos</div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <Card style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <p className="label">Graph data not available.</p>
                            </Card>
                          )}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                          {app.githubData?.projects?.length > 0 && (
                            <div>
                              <p className="label mb-3" style={{ fontSize: '0.65rem' }}>Skill-Matched Projects</p>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {app.githubData.projects.slice(0, 3).map(proj => (
                                  <div key={proj.name} style={{ background: '#F9FBFB', border: '1px solid #E6F0F0', borderRadius: '10px', padding: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                      <a href={proj.url} target="_blank" rel="noreferrer" style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)', textDecoration: 'none' }}>{proj.name}</a>
                                      <span className="mono" style={{ fontSize: '0.65rem', fontWeight: 700, color: '#38A3A5' }}>{proj.personal_contribution?.commit_count || 0} commits</span>
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                      {(proj.languages || []).slice(0, 3).map(lang => (
                                        <span key={lang} style={{ fontSize: '0.6rem', padding: '2px 6px', background: 'white', border: '1px solid #eee', borderRadius: '4px', color: '#666' }}>{lang}</span>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {app.resumeData?.achievements && app.resumeData.achievements.length > 0 && (
                            <div>
                              <p className="label mb-2">Achievements</p>
                              <ul style={{ fontSize: '0.8rem', lineHeight: 1.6, paddingLeft: '20px' }}>
                                {app.resumeData.achievements.slice(0, 3).map((a, i) => (
                                  <li key={i} style={{ marginBottom: '6px' }}>{a}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {app.resumeData?.certifications && app.resumeData.certifications.length > 0 && (
                            <div>
                              <p className="label mb-2">Certifications</p>
                              <ul style={{ fontSize: '0.8rem', lineHeight: 1.6, paddingLeft: '20px' }}>
                                {app.resumeData.certifications.slice(0, 3).map((c, i) => (
                                  <li key={i} style={{ marginBottom: '6px' }}>{c}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {app.githubData && (
                            <div>
                              <p className="label mb-2" style={{ color: '#38A3A5', fontSize: '0.6rem' }}>Matched Skills</p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {(app.githubData?.graph?.nodes?.filter(n => n.status === 'MATCHED') || []).map(node => (
                                  <span key={node.id} style={{ fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', background: 'rgba(56,163,165,0.1)', color: '#38A3A5', borderRadius: '4px' }}>{node.label}</span>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="stat-card" style={{ marginTop: 'auto' }}>
                            <p className="label" style={{ fontSize: '0.65rem', marginBottom: '8px' }}>Analysis Outcome</p>
                            <p style={{ fontSize: '0.85rem', fontWeight: 500, lineHeight: 1.5 }}>
                              {app.githubData?.explainability?.narrative || 'Analysis pending...'}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Roadmap Overview (New View) ── */}
      {view === 'candidate-roadmap' && (
        <div className="anim-slide">
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.25rem' }}>Skill Development Roadmaps</h3>
            <p className="label" style={{ textTransform: 'none' }}>Personalized paths based on your application gaps.</p>
          </div>
          
          {userApps.length === 0 ? (
            <Card>
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <p className="label mb-4">No roadmaps available. Apply to a job to generate one!</p>
                <button className="btn btn-primary" onClick={() => setView('candidate')}>View Open Roles</button>
              </div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {userApps.map(app => {
                const job = jobs.find(j => j.id === app.jobId);
                return (
                  <div key={app.id}>
                    <div style={{ padding: '0 8px 12px 8px' }}>
                      <p className="label" style={{ color: 'var(--primary)', marginBottom: '4px' }}>{job?.title || 'Job Role'}</p>
                      <p style={{ fontSize: '0.75rem', opacity: 0.6 }}>Generated from your recent application</p>
                    </div>
                    <Roadmap data={app.githubData} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .loader {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 50%;
          border-top-color: #fff;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
};

export default CandidatePortal;
