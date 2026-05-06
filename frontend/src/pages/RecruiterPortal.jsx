import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Tag, StatusBadge, StatBlock } from '../components/UIComponents';
import { computeSkillMatch } from '../utils/skillMatcher';

const RecruiterPortal = () => {
  const { jobs, addJob, applications, updateApplicationStatus, currentUser } = useApp();
  const [tab, setTab] = useState('jobs');
  const [newJob, setNewJob] = useState({ title: '', skills: '' });
  const [expanded, setExpanded] = useState(null);

  const handlePost = (e) => {
    e.preventDefault();
    if (!newJob.title || !newJob.skills) return;
    addJob({ title: newJob.title, requiredSkills: newJob.skills.split(',').map(s => s.trim()).filter(Boolean) });
    setNewJob({ title: '', skills: '' });
  };

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', background: '#f4f1ed' }}>
      {/* Page header */}
      <div style={{ background: '#0a0a0a', borderBottom: '1px solid #1a1a1a', padding: '40px' }}>
        <div className="container" style={{ padding: 0 }}>
          <p className="label" style={{ color: '#555', marginBottom: '12px' }}>◆ RECRUITER DASHBOARD</p>
          <h2 style={{ color: '#fff' }}>Welcome back, {currentUser.name.split(' ')[0]}.</h2>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '48px', paddingBottom: '80px' }}>
        {/* Tabs */}
        <div className="tabs">
          <button className={`tab-btn ${tab === 'jobs' ? 'active' : ''}`} onClick={() => setTab('jobs')}>
            Open Roles ({jobs.length})
          </button>
          <button className={`tab-btn ${tab === 'applicants' ? 'active' : ''}`} onClick={() => setTab('applicants')}>
            Applications ({applications.length})
          </button>
          <button className={`tab-btn ${tab === 'post' ? 'active' : ''}`} onClick={() => setTab('post')}>
            + Post New Role
          </button>
        </div>

        {/* ── Posted Jobs ── */}
        {tab === 'jobs' && (
          <div>
            {jobs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0', color: '#888' }}>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8rem' }}>No roles posted yet.</p>
              </div>
            ) : jobs.map(job => (
              <div key={job.id} style={{ borderBottom: '1px solid #ccc', padding: '32px 0', display: 'grid', gridTemplateColumns: '1fr auto', gap: '24px', alignItems: 'center' }}>
                <div>
                  <h3 style={{ marginBottom: '12px' }}>{job.title}</h3>
                  <div>{job.requiredSkills.map(s => <Tag key={s}>{s}</Tag>)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '1.5rem', fontWeight: 700 }}>{job.applicantCount}</div>
                  <div className="label">applicants</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Applications ── */}
        {tab === 'applicants' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {applications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8rem', color: '#888' }}>No applications yet.</p>
              </div>
            ) : applications.map(app => {
              const job = jobs.find(j => j.id === app.jobId);
              const gh = app.githubData;
              const matchPct = computeSkillMatch(job?.requiredSkills || [], gh?.top_skills || []);
              const isOpen = expanded === app.id;

              return (
                <div key={app.id} style={{ background: '#fff', border: '1px solid #0a0a0a', marginBottom: '8px' }}>
                  {/* Row header */}
                  <div
                    onClick={() => setExpanded(isOpen ? null : app.id)}
                    style={{ padding: '24px 32px', display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: '24px', alignItems: 'center', cursor: 'pointer' }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '4px' }}>{app.name}</div>
                      <div className="label" style={{ color: '#888' }}>{app.email} · {job?.title}</div>
                    </div>
                    {gh && (
                      <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '1.4rem', fontWeight: 700, color: matchPct >= 60 ? '#00b368' : matchPct >= 30 ? '#e6a000' : '#e63232' }}>
                        {matchPct}%
                      </div>
                    )}
                    <StatusBadge status={app.status} />
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.7rem', color: '#888' }}>
                      {isOpen ? '▲ collapse' : '▼ expand'}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isOpen && (
                    <div style={{ borderTop: '1px solid #eee', padding: '32px', display: 'flex', flexDirection: 'column', gap: '32px' }}>

                      {/* Resume skills */}
                      <div>
                        <p className="label" style={{ marginBottom: '12px' }}>Resume Skills</p>
                        <div>{(app.resumeData?.skills || []).map(s => <Tag key={s}>{s}</Tag>)}</div>
                        {app.resumeData?.cgpa && (
                          <p style={{ marginTop: '12px', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8rem', color: '#666' }}>
                            CGPA: {app.resumeData.cgpa}/{app.resumeData.cgpa_scale || 10}
                          </p>
                        )}
                      </div>

                      {/* GitHub evidence */}
                      {gh && (
                        <div>
                          <p className="label" style={{ marginBottom: '16px' }}>GitHub Evidence · <span style={{ color: '#0a0a0a' }}>@{gh.username}</span></p>
                          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                            <StatBlock num={gh.contributions?.total_commits || 0} label="Commits" />
                            <StatBlock num={gh.contributions?.total_prs || 0} label="Pull Requests" />
                            <StatBlock num={gh.public_repos || 0} label="Public Repos" />
                            <StatBlock num={gh.total_stars || 0} label="Stars" />
                            <StatBlock num={`${matchPct}%`} label="Skill Match" accent />
                          </div>
                          <div style={{ marginBottom: '16px' }}>
                            <p className="label" style={{ marginBottom: '8px' }}>Verified Skills</p>
                            {(gh.top_skills || []).map(s => <Tag key={s} variant="filled">{s}</Tag>)}
                          </div>
                          {(gh.projects || []).slice(0, 2).map(p => (
                            <div key={p.name} style={{ padding: '16px', border: '1px solid #e8e8e8', marginBottom: '8px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '16px' }}>
                              <div>
                                <div style={{ fontWeight: 600, marginBottom: '4px' }}>{p.name}</div>
                                <div style={{ fontSize: '0.85rem', color: '#666' }}>{p.description}</div>
                                <div style={{ marginTop: '8px' }}>
                                  {Object.keys(p.languages || {}).slice(0, 4).map(l => <Tag key={l}>{l}</Tag>)}
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: '#888' }}>
                                {p.personal_contribution?.commit_count || 0} commits
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div style={{ display: 'flex', gap: '12px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                        <button className="btn" onClick={() => updateApplicationStatus(app.id, 'HIRED')} disabled={app.status !== 'PENDING'} style={{ opacity: app.status !== 'PENDING' ? 0.4 : 1 }}>
                          Mark Hired
                        </button>
                        <button className="btn btn-outline" onClick={() => updateApplicationStatus(app.id, 'REJECTED')} disabled={app.status !== 'PENDING'} style={{ opacity: app.status !== 'PENDING' ? 0.4 : 1 }}>
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ── Post New Role ── */}
        {tab === 'post' && (
          <div style={{ maxWidth: '600px' }}>
            <h3 style={{ marginBottom: '8px' }}>Post a New Role</h3>
            <p style={{ color: '#888', marginBottom: '40px', fontSize: '0.9rem' }}>Define the job and required skills. Candidates will be matched against these automatically.</p>

            <form onSubmit={handlePost} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label className="label" style={{ marginBottom: '8px', display: 'block' }}>Job Title</label>
                <input
                  type="text"
                  placeholder="e.g. Senior Backend Engineer"
                  value={newJob.title}
                  onChange={e => setNewJob({ ...newJob, title: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="label" style={{ marginBottom: '8px', display: 'block' }}>Required Skills <span style={{ color: '#888', textTransform: 'none', letterSpacing: 0 }}>(comma-separated)</span></label>
                <textarea
                  placeholder="Python, Docker, REST API, PostgreSQL"
                  value={newJob.skills}
                  onChange={e => setNewJob({ ...newJob, skills: e.target.value })}
                  required
                />
              </div>
              {newJob.skills && (
                <div>
                  <p className="label" style={{ marginBottom: '8px' }}>Preview</p>
                  <div>{newJob.skills.split(',').map(s => s.trim()).filter(Boolean).map(s => <Tag key={s}>{s}</Tag>)}</div>
                </div>
              )}
              <button type="submit" className="btn" style={{ alignSelf: 'flex-start' }}>Post Role →</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecruiterPortal;
