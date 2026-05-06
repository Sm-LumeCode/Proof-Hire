import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Tag, StatusBadge } from '../components/UIComponents';
import { extractTextFromPDF, parseResumeWithGroq } from '../utils/groqParser';
import { fetchGitHubData } from '../utils/githubApi';

const STEP_LABELS = { extracting: 'Reading PDF…', fetching: 'Fetching GitHub…', done: 'Done!' };

const CandidatePortal = () => {
  const { jobs, addApplication, applications, currentUser } = useApp();
  const [tab, setTab] = useState('jobs');
  const [applyingTo, setApplyingTo] = useState(null);
  const [step, setStep] = useState(null);
  const [error, setError] = useState('');

  const handleApply = async (e, jobId) => {
    e.preventDefault();
    const file = e.target.resume.files[0];
    if (!file) { setError('Please select a PDF.'); return; }
    setError('');

    try {
      setStep('extracting');
      const text = await extractTextFromPDF(file);
      const resumeData = await parseResumeWithGroq(text);

      let githubData = null;
      if (resumeData.github_username) {
        setStep('fetching');
        githubData = await fetchGitHubData(resumeData.github_username);
      }

      addApplication({ jobId, name: currentUser.name, email: currentUser.email, resumeData, githubData });
      setStep('done');
      setTimeout(() => { setStep(null); setApplyingTo(null); setTab('applications'); }, 1500);
    } catch (err) {
      setError(err.message);
      setStep(null);
    }
  };

  const userApps = applications.filter(a => a.email === currentUser.email);

  return (
    <div style={{ minHeight: 'calc(100vh - 64px)', background: '#f4f1ed' }}>
      {/* Header */}
      <div style={{ background: '#0a0a0a', padding: '40px' }}>
        <div className="container" style={{ padding: 0 }}>
          <p className="label" style={{ color: '#555', marginBottom: '12px' }}>◆ CANDIDATE DASHBOARD</p>
          <h2 style={{ color: '#fff' }}>{currentUser.name.split(' ')[0]}.</h2>
          <p style={{ color: '#444', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', marginTop: '8px' }}>{currentUser.email}</p>
        </div>
      </div>

      <div className="container" style={{ paddingTop: '48px', paddingBottom: '80px' }}>
        <div className="tabs">
          <button className={`tab-btn ${tab === 'jobs' ? 'active' : ''}`} onClick={() => setTab('jobs')}>
            Open Roles ({jobs.length})
          </button>
          <button className={`tab-btn ${tab === 'applications' ? 'active' : ''}`} onClick={() => setTab('applications')}>
            My Applications ({userApps.length})
          </button>
        </div>

        {/* ── Open Roles ── */}
        {tab === 'jobs' && (
          <div>
            {jobs.map(job => (
              <div key={job.id} style={{ marginBottom: '8px' }}>
                <div style={{ background: '#fff', border: '1px solid #0a0a0a', padding: '32px', display: 'grid', gridTemplateColumns: '1fr auto', gap: '32px', alignItems: 'center' }}>
                  <div>
                    <h3 style={{ marginBottom: '12px' }}>{job.title}</h3>
                    <div>{job.requiredSkills.map(s => <Tag key={s}>{s}</Tag>)}</div>
                  </div>
                  <button
                    className="btn"
                    onClick={() => { setApplyingTo(applyingTo === job.id ? null : job.id); setError(''); setStep(null); }}
                  >
                    {applyingTo === job.id ? 'Cancel' : 'Apply →'}
                  </button>
                </div>

                {applyingTo === job.id && (
                  <div style={{ border: '1px solid #0a0a0a', borderTop: 'none', background: '#f9f7f4', padding: '32px' }}>
                    <p className="label" style={{ marginBottom: '24px' }}>Application Form</p>
                    <form onSubmit={(e) => handleApply(e, job.id)} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '480px' }}>
                      <div>
                        <label className="label" style={{ marginBottom: '8px', display: 'block' }}>Resume (PDF)</label>
                        <input name="resume" type="file" accept=".pdf" required />
                      </div>

                      {error && <div className="error-strip">{error}</div>}

                      {step === 'done' && (
                        <div className="success-strip">Application submitted successfully!</div>
                      )}

                      <button
                        type="submit"
                        className="btn btn-lime"
                        disabled={!!step && step !== 'done'}
                        style={{ alignSelf: 'flex-start' }}
                      >
                        {step ? STEP_LABELS[step] : 'Submit Application →'}
                      </button>
                    </form>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── My Applications ── */}
        {tab === 'applications' && (
          <div>
            {userApps.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <p style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.8rem', color: '#888' }}>No applications yet. Browse open roles to apply.</p>
              </div>
            ) : userApps.map(app => {
              const job = jobs.find(j => j.id === app.jobId);
              return (
                <div key={app.id} style={{ background: '#fff', border: '1px solid #0a0a0a', padding: '28px 32px', marginBottom: '8px', display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '24px', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: 700, marginBottom: '4px' }}>{job?.title}</div>
                    <div className="label" style={{ color: '#888' }}>Applied {new Date(app.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  </div>
                  {app.githubData && (
                    <div style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.75rem', color: '#888' }}>
                      @{app.githubData.username}
                    </div>
                  )}
                  <StatusBadge status={app.status} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CandidatePortal;
