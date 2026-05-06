import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Tag, StatusBadge, StatBlock, Tabs, Card } from '../components/UIComponents';
import { computeSkillMatch } from '../utils/skillMatcher';

const RecruiterPortal = ({ view = 'recruiter', setView, onViewGraph }) => {
  const { jobs, addJob, applications, updateApplicationStatus, currentUser } = useApp();
  const [newJob, setNewJob] = useState({ title: '', skills: '' });
  const [expanded, setExpanded] = useState(null);

  const handlePost = (e) => {
    e.preventDefault();
    if (!newJob.title || !newJob.skills) return;
    addJob({ 
      title: newJob.title, 
      requiredSkills: newJob.skills.split(',').map(s => s.trim()).filter(Boolean) 
    });
    setNewJob({ title: '', skills: '' });
    if (setView) setView('recruiter');
  };


  return (
    <div>
      <header className="mb-4">
        <p className="label mb-1">Recruiter Dashboard</p>
        <h2>Welcome back, {currentUser.name.split(' ')[0]}.</h2>
      </header>

      {/* ── Posted Jobs ── */}
      {view === 'recruiter' && (
        <div className="anim-slide">
          {jobs.length === 0 ? (
            <Card>
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <p className="label mb-4">No roles posted yet</p>
                <button className="btn btn-primary" onClick={() => setView('recruiter-post')}>Post your first role</button>
              </div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {jobs.map(job => (
                <Card key={job.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 className="mb-4">{job.title}</h3>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {job.requiredSkills.map(s => <Tag key={s}>{s}</Tag>)}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span className="stat-value" style={{ fontSize: '1.5rem' }}>{job.applicantCount}</span>
                      <span className="label">applicants</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Applications ── */}
      {view === 'recruiter-applications' && (
        <div className="anim-slide">
          {applications.length === 0 ? (
            <Card>
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <p className="label">No applications received yet</p>
              </div>
            </Card>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {applications.map(app => {
                const job = jobs.find(j => j.id === app.jobId);
                const gh = app.githubData;
                const matchPct = computeSkillMatch(job?.requiredSkills || [], gh?.top_skills || []);
                const isOpen = expanded === app.id;

                return (
                  <Card key={app.id} style={{ padding: isOpen ? '0' : '20px' }}>
                    <div
                      onClick={() => setExpanded(isOpen ? null : app.id)}
                      style={{ 
                        padding: isOpen ? '24px 32px' : '0', 
                        display: 'flex', 
                        flexWrap: 'wrap',
                        justifyContent: 'space-between',
                        gap: '24px', 
                        alignItems: 'center', 
                        cursor: 'pointer' 
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--primary)' }}>{app.name}</div>
                        <div className="label" style={{ marginTop: '4px' }}>{job?.title || 'Unknown Role'}</div>
                      </div>
                      
                      {gh && (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ 
                            fontFamily: 'IBM Plex Mono, monospace', 
                            fontSize: '1.2rem', 
                            fontWeight: 700, 
                            color: matchPct >= 60 ? 'var(--success)' : matchPct >= 30 ? 'var(--accent)' : 'var(--error)' 
                          }}>
                            {matchPct}%
                          </div>
                          <div className="label" style={{ fontSize: '0.5rem' }}>Match</div>
                        </div>
                      )}

                      <StatusBadge status={app.status} />
                      
                      <div className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '0.7rem' }}>
                        {isOpen ? 'Close' : 'View Details'}
                      </div>
                    </div>

                    {isOpen && (
                      <div style={{ borderTop: 'var(--border)', padding: '32px', background: 'var(--surface)' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '40px' }}>
                          {/* Resume info */}
                          <div>
                            <p className="label mb-4">Extracted from Resume</p>
                            <div className="mb-4">
                              <p className="label mb-2" style={{ color: 'var(--primary)' }}>Skills</p>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {(app.resumeData?.skills || []).map(s => <Tag key={s} variant="accent">{s}</Tag>)}
                              </div>
                            </div>
                            {app.resumeData?.cgpa && (
                              <div className="stat-card" style={{ padding: '12px' }}>
                                <span className="label" style={{ display: 'block' }}>Academic Performance</span>
                                <span style={{ fontWeight: 600 }}>{app.resumeData.cgpa} CGPA</span>
                              </div>
                            )}
                          </div>

                          {/* GitHub info */}
                          <div>
                            <p className="label mb-4">GitHub Evidence · @{gh?.username || 'N/A'}</p>
                            {gh ? (
                              <>
                                <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '24px' }}>
                                  <StatBlock num={gh.contributions?.total_commits || 0} label="Commits" />
                                  <StatBlock num={gh.total_stars || 0} label="Stars" />
                                </div>
                                <p className="label mb-2" style={{ color: 'var(--primary)' }}>Verified via Repos</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {(gh.top_skills || []).map(s => <Tag key={s} variant="filled">{s}</Tag>)}
                                </div>
                              </>
                            ) : (
                              <p style={{ fontStyle: 'italic', color: 'var(--text-muted)' }}>No GitHub data available.</p>
                            )}
                          </div>
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                          {gh && (
                            <button 
                              className="btn btn-primary" 
                              style={{ background: 'var(--primary)', color: 'white' }}
                              onClick={(e) => { e.stopPropagation(); onViewGraph(app); }}
                            >
                              View Evidence Graph →
                            </button>
                          )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px', marginTop: '40px', paddingTop: '24px', borderTop: 'var(--border)' }}>
                          <button 
                            className="btn btn-primary" 
                            onClick={(e) => { e.stopPropagation(); updateApplicationStatus(app.id, 'HIRED'); }} 
                            disabled={app.status !== 'PENDING'}
                          >
                            Mark as Hired
                          </button>
                          <button 
                            className="btn btn-outline" 
                            onClick={(e) => { e.stopPropagation(); updateApplicationStatus(app.id, 'REJECTED'); }} 
                            disabled={app.status !== 'PENDING'}
                          >
                            Reject Application
                          </button>
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Post New Role ── */}
      {view === 'recruiter-post' && (
        <div className="anim-slide" style={{ maxWidth: '640px' }}>
          <Card title="Create a New Opportunity" subtitle="Define requirements for automatic matching">
            <form onSubmit={handlePost} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label className="label mb-2">Job Title</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Frontend Engineer"
                  value={newJob.title}
                  onChange={e => setNewJob({ ...newJob, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label mb-2">Required Skills (Comma separated)</label>
                <textarea
                  placeholder="React, TypeScript, CSS, Node.js"
                  value={newJob.skills}
                  onChange={e => setNewJob({ ...newJob, skills: e.target.value })}
                  required
                  rows={4}
                />
              </div>
              {newJob.skills && (
                <div>
                  <p className="label mb-2">Matching Filter Preview</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {newJob.skills.split(',').map(s => s.trim()).filter(Boolean).map(s => <Tag key={s} variant="accent">{s}</Tag>)}
                  </div>
                </div>
              )}
              <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Post Opportunity →</button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default RecruiterPortal;
