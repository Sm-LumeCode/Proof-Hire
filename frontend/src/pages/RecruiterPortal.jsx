import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Tag, StatusBadge, StatBlock, Tabs, Card } from '../components/UIComponents';
import { computeSkillMatch } from '../utils/skillMatcher';
import { SkillGraph } from '../components/SkillGraph';

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
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
                          {/* Resume & GitHub Intelligence Column */}
                          <div>
                            <div style={{ marginBottom: '32px' }}>
                              <p className="label mb-4">Resume Extraction Intelligence</p>
                              <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: 'var(--border)' }}>
                                <p className="label mb-2" style={{ fontSize: '0.6rem' }}>Claimed Skills</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {(app.resumeData?.skills || []).slice(0, 10).map(s => <Tag key={s} variant="accent">{s}</Tag>)}
                                </div>
                                {app.resumeData?.projects?.length > 0 && (
                                  <div style={{ marginTop: '16px' }}>
                                    <p className="label mb-2" style={{ fontSize: '0.6rem' }}>Highlighted Projects</p>
                                    <ul style={{ fontSize: '0.75rem', paddingLeft: '16px', color: 'var(--text-muted)' }}>
                                      {app.resumeData.projects.slice(0, 2).map((p, i) => <li key={i}>{typeof p === 'string' ? p : p.title}</li>)}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              <p className="label mb-4">GitHub Verified Evidence · @{gh?.username || 'N/A'}</p>
                              {gh ? (
                                <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: 'var(--border)' }}>
                                  <div className="stat-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                    <StatBlock num={gh.contributions?.total_commits || 0} label="Commits" />
                                    <StatBlock num={gh.total_stars || 0} label="Stars" />
                                  </div>
                                  <p className="label mb-2" style={{ fontSize: '0.6rem' }}>Proven Tech Stack</p>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                    {(gh.top_skills || []).map(s => <Tag key={s} variant="filled">{s}</Tag>)}
                                  </div>
                                </div>
                              ) : (
                                <div style={{ padding: '20px', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  Awaiting GitHub synchronization...
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Graph & Gap Analysis Column */}
                          <div>
                            {gh && gh.graph ? (
                              <>
                                <p className="label mb-4">Semantic Skill Mapping</p>
                                <SkillGraph data={gh} height="440px" name={app.name} />
                                
                                {gh.gap_analysis?.gaps?.length > 0 && (
                                  <div style={{ marginTop: '24px' }}>
                                    <p className="label mb-4">Gap Intelligence & Learning Path</p>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                      {gh.gap_analysis.gaps.slice(0, 2).map(gap => (
                                        <div key={gap.skill} style={{ padding: '12px', background: 'rgba(188,75,81,0.05)', border: '1px solid rgba(188,75,81,0.1)', borderRadius: '8px' }}>
                                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>{gap.skill}</span>
                                            <span className="label" style={{ color: '#BC4B51', fontSize: '0.55rem' }}>Priority: {(gap.gap_priority * 100).toFixed(0)}</span>
                                          </div>
                                          {gap.learning_path?.length > 0 && (
                                            <div style={{ fontSize: '0.65rem', color: '#666' }}>
                                              Path: <span style={{ fontWeight: 600 }}>{gap.learning_path.join(' → ')}</span>
                                            </div>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', borderRadius: '12px', border: 'var(--border)' }}>
                                <p className="label">Graph analysis pending data extraction</p>
                              </div>
                            )}
                          </div>
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
