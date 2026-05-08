import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Tag, StatusBadge, Tabs, Card } from '../components/UIComponents';
import { SkillGraph } from '../components/SkillGraph';

const STEP_LABELS = { extracting: 'Parsing PDF…', fetching: 'Analyzing GitHub…', done: 'Applied!' };

const CandidatePortal = ({ view = 'candidate', setView }) => {
  const { jobs, addApplication, applications, currentUser } = useApp();
  const [applyingTo, setApplyingTo] = useState(null);
  const [expandedApp, setExpandedApp] = useState(null);
  const [step, setStep] = useState(null);
  const [error, setError] = useState('');

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

      const response = await fetch('http://127.0.0.1:8002/api/apply', {
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

  const userApps = applications.filter(a => a.email === currentUser.email);

  return (
    <div>
      <header className="mb-4">
        <p className="label mb-1">Candidate Dashboard</p>
        <h2>Welcome, {currentUser.name.split(' ')[0]}.</h2>
        <p className="mono" style={{ fontSize: '0.75rem', opacity: 0.6 }}>{currentUser.email}</p>
      </header>

      {/* ── Open Roles ── */}
      {view === 'candidate' && (
        <div className="anim-slide" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
                            <span className="loader" /> {STEP_LABELS[step]}
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
                      {isExpanded ? 'Close' : 'View Graph'}
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
                            <SkillGraph data={app.githubData} height="400px" name="Your" />
                          ) : (
                            <Card style={{ height: '400px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <p className="label">Graph data not available.</p>
                            </Card>
                          )}
                        </div>

                        {/* Sidebar: Matched & Missing */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                          <div>
                            <p className="label mb-2" style={{ color: '#38A3A5', fontSize: '0.6rem' }}>Matched Skills</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {(app.githubData?.graph?.nodes?.filter(n => n.status === 'MATCHED') || []).map(node => (
                                <span key={node.id} style={{ fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', background: 'rgba(56,163,165,0.1)', color: '#38A3A5', borderRadius: '4px' }}>{node.label}</span>
                              ))}
                            </div>
                          </div>

                          <div>
                            <p className="label mb-2" style={{ color: '#BC4B51', fontSize: '0.6rem' }}>Missing Things</p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {(app.githubData?.gap_analysis?.gaps || []).map(gap => (
                                <span key={gap.skill} style={{ fontSize: '0.7rem', fontWeight: 700, padding: '4px 10px', background: 'rgba(188,75,81,0.1)', color: '#BC4B51', borderRadius: '4px' }}>{gap.skill}</span>
                              ))}
                            </div>
                          </div>

                          <div style={{ marginTop: 'auto', padding: '16px', background: 'var(--surface)', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
                            <p className="label mb-2" style={{ fontSize: '0.6rem' }}>Outcome</p>
                            <p style={{ fontSize: '0.75rem', lineHeight: '1.5', color: 'var(--text-muted)' }}>
                              {app.githubData?.explainability?.narrative || 'Analyzing alignment...'}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Summary */}
                      <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: 'var(--border)' }}>
                        <p className="label mb-3" style={{ fontSize: '0.65rem' }}>Resume Intelligence Summary</p>
                        <div style={{ background: 'var(--surface)', padding: '16px', borderRadius: '12px', fontSize: '0.85rem', lineHeight: '1.6' }}>
                          <p><strong>Profile Focus:</strong> Your resume highlights core expertise in <strong>{app.resumeData?.skills?.slice(0, 3).join(', ')}</strong>. The analysis shows a <strong>{(app.githubData?.explainability?.fit_score * 100 || 0).toFixed(0)}%</strong> alignment with the required skills for this role.</p>
                          <p style={{ marginTop: '8px' }}><strong>Gap Analysis:</strong> Based on the skills asked, we identified gaps in <strong>{app.githubData?.gap_analysis?.gaps?.map(g => g.skill).join(', ') || 'no major areas'}</strong>. GitHub verification confirms your proficiency in <strong>{app.githubData?.top_skills?.slice(0, 3).join(', ')}</strong>.</p>
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
