import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Tag, StatusBadge, StatBlock, Tabs, Card } from '../components/UIComponents';
import { computeSkillMatch } from '../utils/skillMatcher';
import { SkillGraph } from '../components/SkillGraph';

const RecruiterPortal = ({ view = 'recruiter', setView, onViewGraph }) => {
  const { jobs, addJob, applications, updateApplicationStatus, currentUser } = useApp();
  const [newJob, setNewJob] = useState({ title: '', skills: '' });
  const [expanded, setExpanded] = useState(null);
  const [expandedProject, setExpandedProject] = useState(null);

  const getUrlBadgeStyle = (label = '') => {
    const key = label.toLowerCase();
    if (key.includes('linkedin')) return { background: '#dbeafe', color: '#1d4ed8' };
    if (key.includes('github')) return { background: '#dcfce7', color: '#15803d' };
    if (key.includes('portfolio')) return { background: '#fce7f3', color: '#9d174d' };
    return { background: '#f3f4f6', color: '#555' };
  };

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
                                <div style={{ marginBottom: '12px' }}>
                                  <p className="label mb-2" style={{ fontSize: '0.6rem' }}>Parsed Name</p>
                                  <div style={{ fontSize: '1rem', fontWeight: 700 }}>{app.resumeData?.name || app.name}</div>
                                </div>

                                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                                  <div style={{ background: '#f8f8f8', borderRadius: '8px', padding: '8px 10px', minWidth: '120px' }}>
                                    <p className="label" style={{ fontSize: '0.55rem' }}>CGPA / GPA</p>
                                    <div style={{ fontWeight: 700, marginTop: '2px' }}>{app.resumeData?.cgpa || 'N/A'}</div>
                                  </div>
                                  {app.resumeData?.cgpa_scale && (
                                    <div style={{ background: '#f8f8f8', borderRadius: '8px', padding: '8px 10px', minWidth: '120px' }}>
                                      <p className="label" style={{ fontSize: '0.55rem' }}>Scale</p>
                                      <div style={{ fontWeight: 700, marginTop: '2px' }}>out of {app.resumeData.cgpa_scale}</div>
                                    </div>
                                  )}
                                </div>

                                <p className="label mb-2" style={{ fontSize: '0.6rem' }}>Claimed Skills</p>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {(app.resumeData?.skills || []).slice(0, 10).map(s => <Tag key={s} variant="accent">{s}</Tag>)}
                                </div>

                                <div style={{ marginTop: '12px' }}>
                                  <p className="label mb-2" style={{ fontSize: '0.6rem' }}>Profile Links</p>
                                  {(app.resumeData?.urls || []).length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                      {app.resumeData.urls.slice(0, 4).map((u, i) => (
                                        <a
                                          key={`${u.url}-${i}`}
                                          href={u.url}
                                          target="_blank"
                                          rel="noreferrer"
                                          style={{ display: 'flex', gap: '8px', alignItems: 'center', fontSize: '0.72rem', color: 'var(--text)', textDecoration: 'none', background: '#f8f8f8', padding: '6px 8px', borderRadius: '8px' }}
                                        >
                                          <span style={{ fontSize: '0.6rem', borderRadius: '6px', padding: '2px 6px', fontWeight: 700, ...getUrlBadgeStyle(u.label) }}>
                                            {u.label || 'Other'}
                                          </span>
                                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.url}</span>
                                        </a>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="label" style={{ fontSize: '0.65rem' }}>No links extracted</p>
                                  )}
                                </div>

                                {app.resumeData?.projects?.length > 0 && (
                                  <div style={{ marginTop: '16px' }}>
                                    <p className="label mb-2" style={{ fontSize: '0.6rem' }}>Highlighted Projects</p>
                                    <ul style={{ fontSize: '0.75rem', paddingLeft: '16px', color: 'var(--text-muted)' }}>
                                      {app.resumeData.projects.slice(0, 2).map((p, i) => <li key={i}>{typeof p === 'string' ? p : p.title}</li>)}
                                    </ul>
                                  </div>
                                )}

                                <div style={{ marginTop: '12px' }}>
                                  <p className="label mb-2" style={{ fontSize: '0.6rem' }}>Achievements & Certifications</p>
                                  {app.resumeData?.achievements?.length > 0 ? (
                                    <ul style={{ fontSize: '0.72rem', paddingLeft: '16px', color: 'var(--text-muted)' }}>
                                      {app.resumeData.achievements.slice(0, 4).map((a, i) => <li key={`${a}-${i}`}>{a}</li>)}
                                    </ul>
                                  ) : (
                                    <p className="label" style={{ fontSize: '0.65rem' }}>No achievements extracted</p>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div>
                              <p className="label mb-4">Technical Evidence Summary · @{gh?.username || 'N/A'}</p>
                              {gh ? (
                                <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: 'var(--border)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
                                  <div className="stat-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
                                    <StatBlock num={gh.contributions?.total_commits || 0} label="Commits" />
                                    <StatBlock num={gh.total_stars || 0} label="Stars" />
                                    <StatBlock num={gh.public_repos || 0} label="Projects" />
                                  </div>

                                  <div style={{ padding: '16px', background: 'var(--primary)', color: 'white', borderRadius: '12px', marginBottom: '24px', textAlign: 'center' }}>
                                    <div style={{ fontSize: '0.65rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>AI Fit Score</div>
                                    <div style={{ fontSize: '2rem', fontWeight: 900 }}>{(gh.explainability?.fit_score * 100 || 0).toFixed(0)}%</div>
                                  </div>

                                  <div style={{ marginBottom: '8px' }}>
                                    <p className="label mb-3" style={{ fontSize: '0.6rem' }}>Verified Core Skills (Evidence-Backed)</p>
                                    <ul style={{ padding: 0, listStyle: 'none', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                      {(gh.top_skills || []).slice(0, 8).map(s => (
                                        <li key={s} style={{ fontSize: '0.8rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                          <span style={{ color: 'var(--success)', fontWeight: 900 }}>•</span> {s}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>

                                  {(gh.projects || []).length > 0 && (
                                    <div style={{ marginTop: '14px' }}>
                                      <p className="label mb-2" style={{ fontSize: '0.6rem' }}>Top GitHub Repositories</p>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {gh.projects.slice(0, 5).map((repo, idx) => (
                                          <div key={`${repo.full_name || repo.name}-${idx}`} style={{ border: '1px solid #eee', borderRadius: '8px', padding: '8px 10px', background: '#fafafa' }}>
                                            <a
                                              href={repo.url}
                                              target="_blank"
                                              rel="noreferrer"
                                              style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--primary)', textDecoration: 'none' }}
                                            >
                                              {repo.full_name || repo.name}
                                            </a>
                                            {(repo.languages || repo.primary_language || repo.inferred_skills)?.length > 0 ? (
                                              <div style={{ marginTop: '6px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                {(repo.languages?.length ? repo.languages : repo.primary_language ? [repo.primary_language] : (repo.inferred_skills || [])).slice(0, 4).map(lang => (
                                                  <span key={`${repo.name}-${lang}`} style={{ fontSize: '0.62rem', background: '#edf2ff', color: '#2b4acb', borderRadius: '999px', padding: '2px 7px', fontWeight: 600 }}>
                                                    {lang}
                                                  </span>
                                                ))}
                                              </div>
                                            ) : (
                                              <div style={{ marginTop: '6px', fontSize: '0.65rem', color: 'var(--text-muted)' }}>Languages not available</div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div style={{ padding: '20px', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                  Awaiting GitHub synchronization...
                                </div>
                              )}
                            </div>

                            <div style={{ marginTop: '32px' }}>
                              <p className="label mb-4">Skill-Matched Projects</p>
                              {gh?.projects?.length > 0 ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                  {gh.projects.slice(0, 5).map(proj => {
                                    const isProjExpanded = expandedProject === proj.name;
                                    return (
                                      <div key={proj.name} style={{ background: 'white', borderRadius: '12px', border: 'var(--border)', overflow: 'hidden', transition: 'all 0.3s ease' }}>
                                        <div
                                          onClick={(e) => { e.stopPropagation(); setExpandedProject(isProjExpanded ? null : proj.name); }}
                                          style={{ padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: isProjExpanded ? 'rgba(0,0,0,0.02)' : 'white' }}
                                        >
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--primary)' }}>{proj.name}</span>
                                            {proj.relevance_score > 0.7 && <span style={{ fontSize: '0.55rem', background: 'var(--primary)', color: 'white', padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>High Match</span>}
                                          </div>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ transform: isProjExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s', fontSize: '0.8rem' }}>{isProjExpanded ? '▲' : '▼'}</span>
                                          </div>
                                        </div>

                                        {isProjExpanded && (
                                          <div style={{ padding: '20px', borderTop: 'var(--border)', background: 'var(--bg)' }}>
                                            {proj.description && (
                                              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: '1.5', marginBottom: '16px' }}>
                                                {proj.description}
                                              </p>
                                            )}

                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                              <div style={{ padding: '12px', background: 'white', borderRadius: '10px', border: 'var(--border)', textAlign: 'center' }}>
                                                <div className="label" style={{ fontSize: '0.5rem', marginBottom: '4px' }}>Repo Stars</div>
                                                <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--primary)' }}>{proj.stars}</div>
                                              </div>
                                              <div style={{ padding: '12px', background: 'white', borderRadius: '10px', border: 'var(--border)', textAlign: 'center' }}>
                                                <div className="label" style={{ fontSize: '0.5rem', marginBottom: '4px' }}>Your Commits</div>
                                                <div style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--primary)' }}>{proj.personal_contribution?.commit_count || 0}</div>
                                              </div>
                                            </div>

                                            {proj.inferred_skills?.length > 0 && (
                                              <div style={{ marginBottom: '16px' }}>
                                                <p className="label mb-2" style={{ fontSize: '0.55rem' }}>Tech Stack & Skills</p>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                  {proj.inferred_skills.map(s => (
                                                    <span key={s} style={{ fontSize: '0.65rem', padding: '4px 10px', background: 'white', border: '1px solid rgba(0,0,0,0.1)', color: 'var(--primary)', borderRadius: '6px', fontWeight: 700 }}>{s}</span>
                                                  ))}
                                                </div>
                                              </div>
                                            )}

                                            <a
                                              href={proj.url}
                                              target="_blank"
                                              rel="noreferrer"
                                              onClick={(e) => e.stopPropagation()}
                                              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px', background: 'var(--primary)', color: 'white', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, textDecoration: 'none' }}
                                            >
                                              Open Repository on GitHub ↗
                                            </a>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>No projects found.</p>
                              )}
                            </div>
                          </div>

                          {/* Graph & Gap Analysis Column */}
                          <div>
                            {gh && gh.graph ? (
                              <>
                                <div style={{ marginTop: '24px' }}>
                                  <p className="label mb-4">Candidate Intelligence Audit</p>
                                  <div style={{ background: 'white', padding: '24px', borderRadius: '12px', border: 'var(--border)' }}>

                                    <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                                      {/* Left: Skill Mapping */}
                                      <div>
                                        <p className="label mb-3" style={{ fontSize: '0.65rem' }}>Skill Evidence Mapping</p>
                                        <SkillGraph data={gh} height="320px" name={app.name} />
                                      </div>

                                      {/* Right Sidebar: Separate Audit Boxes */}
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: 'var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                                          <p className="label mb-4" style={{ color: '#38A3A5', fontSize: '0.85rem', fontWeight: 800 }}>Matched Competencies</p>
                                          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                            {(gh.graph?.nodes?.filter(n => n.status === 'MATCHED') || []).map(node => (
                                              <div key={node.id}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                                                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--primary)' }}>{node.label}</span>
                                                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38A3A5' }}>{node.skill_match || 0}%</span>
                                                </div>
                                                <div style={{ height: '8px', background: 'rgba(0,0,0,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                                  <div style={{ height: '100%', width: `${node.skill_match || 0}%`, background: '#38A3A5', borderRadius: '4px' }} />
                                                </div>
                                              </div>
                                            ))}
                                          </div>
                                        </div>

                                        <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: 'var(--border)', boxShadow: '0 4px 12px rgba(0,0,0,0.02)' }}>
                                          <p className="label mb-4" style={{ color: '#BC4B51', fontSize: '0.85rem', fontWeight: 800 }}>Missing Requirements</p>
                                          <ul style={{ padding: 0, listStyle: 'none' }}>
                                            {gh.gap_analysis?.gaps?.map(gap => (
                                              <li key={gap.skill} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px', fontSize: '0.9rem', color: '#BC4B51', fontWeight: 600 }}>
                                                <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>•</span>
                                                {gap.skill}
                                              </li>
                                            ))}
                                          </ul>
                                        </div>

                                        <div style={{ background: 'rgba(56,163,165,0.05)', padding: '24px', borderRadius: '16px', border: '1px solid rgba(56,163,165,0.1)' }}>
                                          <p className="label mb-3" style={{ fontSize: '0.85rem', color: '#38A3A5', fontWeight: 800 }}>AI Technical Verdict</p>
                                          <p style={{ fontSize: '0.9rem', lineHeight: '1.5', color: 'var(--text-main)', fontWeight: 600 }}>
                                            {gh.explainability?.fit_grade === 'STRONG FIT' ? 'Candidate is highly recommended for technical interview based on deep evidence.' : 'Requires manual verification for the identified skill gaps above.'}
                                          </p>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Full Width Bottom: Personalized Summary Dashboard */}
                                    <div style={{ marginTop: '32px', paddingTop: '32px', borderTop: '2px solid rgba(0,0,0,0.05)' }}>
                                      <h3 style={{ fontSize: '1.2rem', fontWeight: 900, marginBottom: '20px', color: 'var(--primary)' }}>Personalized Intelligence Summary</h3>
                                      <div style={{ background: 'white', padding: '32px', borderRadius: '20px', border: 'var(--border)', boxShadow: '0 10px 30px rgba(0,0,0,0.04)' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '48px' }}>
                                          <div>
                                            <p className="label mb-4" style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 800 }}>CORE STRENGTHS & EVIDENCE</p>
                                            <ul style={{ padding: 0, listStyle: 'none', fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.8' }}>
                                              <li style={{ marginBottom: '12px' }}><strong>• Expertise Alignment:</strong> Proven mastery in <strong>{gh.top_skills?.slice(0, 2).join(' & ')}</strong> with verification across multiple projects.</li>
                                              <li style={{ marginBottom: '12px' }}><strong>• Active Contributions:</strong> High activity level with <strong>{gh.contributions?.total_commits} commits</strong> and <strong>{gh.public_repos}</strong> repositories analyzed.</li>
                                              <li><strong>• Portfolio Highlight:</strong> <strong>{gh.projects?.[0]?.name}</strong> shows complex architectural patterns matching our stack.</li>
                                            </ul>
                                          </div>
                                          <div style={{ borderLeft: '1px solid rgba(0,0,0,0.05)', paddingLeft: '48px' }}>
                                            <p className="label mb-4" style={{ fontSize: '0.8rem', color: '#E09F3E', fontWeight: 800 }}>INTERVIEW STRATEGY & GAPS</p>
                                            <ul style={{ padding: 0, listStyle: 'none', fontSize: '0.95rem', color: 'var(--text-main)', lineHeight: '1.8' }}>
                                              <li style={{ marginBottom: '12px' }}><strong>• Primary Gap:</strong> No evidence found for <strong>{gh.gap_analysis?.gaps?.[0]?.skill || 'missing core skills'}</strong> in the candidate's public work.</li>
                                              <li style={{ marginBottom: '12px' }}><strong>• Knowledge Deep-Dive:</strong> Discuss implementation trade-offs in <strong>{gh.projects?.[1]?.name || 'recent projects'}</strong>.</li>
                                              <li><strong>• Growth Potential:</strong> Evaluate familiarity with <strong>{gh.gap_analysis?.gaps?.[1]?.skill || 'secondary requirements'}</strong> during the live coding session.</li>
                                            </ul>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                  </div>
                                </div>
                              </>
                            ) : (
                              <div style={{ height: '100%', minHeight: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', borderRadius: '12px', border: 'var(--border)' }}>
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
