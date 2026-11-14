import { useEffect, useState, useMemo } from 'react';
import { toast } from "../lib/toast";
import { getUser, fetchJobs, updateProfile, saveUser, requireAuth } from '../lib/api';
import JobCard from '../components/JobCard';
import ResumeUploadModal from '../components/ResumeUploadModal';
import JobPreferencesModal from '../components/JobPreferencesModal';
import { useRouter } from 'next/router';

export default function Dashboard(){
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPreferencesModal, setShowPreferencesModal] = useState(false);
  const [hasResume, setHasResume] = useState(false);
  const [agentInsights, setAgentInsights] = useState(null);
  const [noJobsMessage, setNoJobsMessage] = useState('');
  const router = useRouter();
  const [user, setUser] = useState(null);

  // Search / filter / pagination
  const [query, setQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [visibleCount, setVisibleCount] = useState(20);

  const PAGE = 20;
  const sources = useMemo(() => Array.from(new Set(jobs.map(j => j.source).filter(Boolean))).sort(), [jobs]);
  const jobTypes = useMemo(() => Array.from(new Set(jobs.map(j => (j.job_type || '').trim()).filter(Boolean))).sort(), [jobs]);

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter(j => {
      if (sourceFilter && j.source !== sourceFilter) return false;
      if (typeFilter && (j.job_type || '') !== typeFilter) return false;
      if (q) {
        const hay = `${j.title || ''} ${j.company_name || ''} ${(j.tags || []).join(' ')} ${j.category || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [jobs, query, sourceFilter, typeFilter]);

  // Reset how many are shown whenever the result set changes.
  useEffect(() => { setVisibleCount(PAGE); }, [query, sourceFilter, typeFilter, jobs]);

  const visibleJobs = filteredJobs.slice(0, visibleCount);

  useEffect(()=>{
    (async () => {
      const userData = await requireAuth(router);
      if (!userData) return;
      setUser(userData);
      if (userData?.resumeId) setHasResume(true);
    })();
  },[]);

  async function handleFindJobs() {

    // Check if user has set job preferences (skills or preferredJobTypes)
    if ((!user?.skills || user.skills.length === 0) && (!user?.preferredJobTypes || user.preferredJobTypes.length === 0)) {
      setShowPreferencesModal(true);
      return;
    }
    
    // Fetch jobs
    setLoading(true);
    setNoJobsMessage('');
    try {
      const res = await fetchJobs();
      console.log('📦 API Response:', { count: res.count, jobsLength: res.jobs?.length, hasMessage: !!res.message });
      if (res.jobs) setJobs(res.jobs);
      if (res.message) setNoJobsMessage(res.message);
      if (res.agentReasoning) {
        setAgentInsights({
          used: res.agentUsed,
          profile: res.candidateProfile,
          expansion: res.searchExpansion,
          reasoning: res.agentReasoning
        });
      }
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
      toast('Failed to fetch jobs. Please try again.');
    }
    setLoading(false);
  }

  async function handleSavePreferences(preferences) {
    try {
      const res = await updateProfile(null, preferences);
      if (res.user) {
        const updatedUser = { ...user, ...res.user };
        setUser(updatedUser);
        saveUser(updatedUser);
        setShowPreferencesModal(false);
        
        // Automatically fetch jobs after saving preferences
        setTimeout(() => handleFindJobs(), 500);
      } else {
        toast(res.error || 'Failed to save preferences');
      }
    } catch (err) {
      console.error('Failed to save preferences:', err);
      toast('Failed to save preferences. Please try again.');
    }
  }

  async function handleResumeUploaded(resumeData) {
    setHasResume(true);
    setShowUploadModal(false);
    
    // Update user in state and localStorage with AI-extracted information
    if (resumeData.extractedSkills) {
      const updatedUser = { 
        ...user, 
        skills: resumeData.extractedSkills,
        softSkills: resumeData.softSkills,
        jobCategories: resumeData.jobCategories,
        experienceLevel: resumeData.experienceLevel
      };
      setUser(updatedUser);
      localStorage.setItem('hf_user', JSON.stringify(updatedUser));
      
      // Show agent reasoning
      if (resumeData.agentReasoning) {
        console.log('🤖 Agent Analysis:', resumeData.agentReasoning);
      }
    }
    
    // Automatically fetch jobs after resume upload
    setTimeout(() => handleFindJobs(), 500);
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 50%, #fce7f3 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Animated background shapes */}
      <div style={{
        position: 'fixed',
        top: '-20%',
        right: '-10%',
        width: '600px',
        height: '600px',
        background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        animation: 'float 20s ease-in-out infinite',
        zIndex: 0
      }} />
      <div style={{
        position: 'fixed',
        bottom: '-20%',
        left: '-10%',
        width: '500px',
        height: '500px',
        background: 'linear-gradient(135deg, rgba(240, 147, 251, 0.15) 0%, rgba(245, 101, 101, 0.1) 100%)',
        borderRadius: '50%',
        filter: 'blur(60px)',
        animation: 'float 15s ease-in-out infinite reverse',
        zIndex: 0
      }} />

      {/* Header */}
      <div style={{
        background: 'white',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          padding: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              fontSize: '32px',
              fontWeight: 'bold',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              💼
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '28px', color: '#1e293b' }}>
                Welcome, {user?.name}! 👋
              </h1>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
                {hasResume || (user?.skills && user.skills.length > 0)
                  ? `🎯 Skills: ${user?.skills?.slice(0, 5).join(', ') || 'None set'}${user?.skills?.length > 5 ? ` +${user.skills.length - 5} more` : ''}`
                  : '📝 Upload your resume to get personalized job recommendations'}
              </p>
              {user?.preferredJobTypes && user.preferredJobTypes.length > 0 && (
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#667eea', fontWeight: '500' }}>
                  📍 Looking for: {user.preferredJobTypes.join(', ')}
                  {user?.preferredLocations && user.preferredLocations.length > 0 && (
                    <span> in {user.preferredLocations.join(', ')}</span>
                  )}
                </p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => router.push('/profile')}
              style={{
                background: 'white',
                color: '#667eea',
                border: '2px solid #e2e8f0',
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              👤 My Profile
            </button>
            <button
              onClick={() => router.push('/tracker')}
              style={{
                background: 'white',
                color: '#667eea',
                border: '2px solid #e2e8f0',
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.borderColor = '#e2e8f0';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              🗂️ My Applications
            </button>
            <button
              onClick={() => router.push('/resumes')}
              style={{
                background: 'white',
                color: '#667eea',
                border: '2px solid #e2e8f0',
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.transform = 'translateY(0)'; }}
            >
              📄 My Résumés
            </button>
            <button
              onClick={async () => {
                const next = !user?.jobAlertsEnabled;
                const res = await updateProfile(null, { jobAlertsEnabled: next });
                if (res.user) { setUser(res.user); saveUser(res.user); toast(next ? '🔔 Daily job alerts ON' : 'Daily job alerts off'); }
              }}
              style={{
                background: user?.jobAlertsEnabled ? '#ecfdf5' : 'white',
                color: user?.jobAlertsEnabled ? '#059669' : '#667eea',
                border: `2px solid ${user?.jobAlertsEnabled ? '#6ee7b7' : '#e2e8f0'}`,
                padding: '12px 24px', borderRadius: '10px', cursor: 'pointer',
                fontSize: '14px', fontWeight: '600', transition: 'all 0.3s ease'
              }}
            >
              {user?.jobAlertsEnabled ? '🔔 Alerts On' : '🔕 Daily Alerts'}
            </button>
            <button
              onClick={() => setShowUploadModal(true)}
              style={{
                background: 'white',
                color: '#667eea',
                border: '2px solid #667eea',
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#667eea';
                e.target.style.color = 'white';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white';
                e.target.style.color = '#667eea';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              {hasResume ? '⚙️ Update Profile' : '🚀 Setup Profile'}
            </button>
            <button
              onClick={handleFindJobs}
              disabled={loading}
              style={{
                background: loading ? '#94a3b8' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '10px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: loading ? 'none' : '0 4px 15px rgba(102, 126, 234, 0.4)'
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                }
              }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid white',
                    borderTopColor: 'transparent',
                    borderRadius: '50%',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  Searching...
                </span>
              ) : '🔍 Find Jobs'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '30px 20px',
        position: 'relative',
        zIndex: 1
      }}>
        {jobs.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              padding: '20px 24px',
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              borderRadius: '16px',
              marginBottom: 16,
              border: '1px solid #bae6fd',
              boxShadow: '0 4px 15px rgba(14, 165, 233, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '28px',
                  background: 'linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%)',
                  borderRadius: '12px',
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>🎯</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0c4a6e', marginBottom: '4px' }}>
                    Found {jobs.length} matching job{jobs.length !== 1 ? 's' : ''}
                  </div>
                  {user?.skills && user.skills.length > 0 && (
                    <div style={{ color: '#075985', fontSize: '14px' }}>
                      Based on your skills: {user.skills.slice(0, 5).join(', ')}
                      {user.skills.length > 5 && ` +${user.skills.length - 5} more`}
                    </div>
                  )}
                </div>
                {agentInsights?.used && (
                  <span style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: 'white',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 10px rgba(16, 185, 129, 0.3)'
                  }}>
                    🤖 AI Agent Active
                  </span>
                )}
              </div>
            </div>
            
            {agentInsights?.used && agentInsights.expansion && (
              <details style={{
                marginBottom: 20,
                padding: '20px 24px',
                background: 'linear-gradient(135deg, #fefce8 0%, #fef3c7 100%)',
                borderRadius: '16px',
                border: '1px solid #fde047',
                boxShadow: '0 4px 15px rgba(250, 204, 21, 0.15)',
                cursor: 'pointer'
              }}>
                <summary style={{
                  fontWeight: 'bold',
                  color: '#854d0e',
                  fontSize: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '24px' }}>💡</span>
                  AI Agent Insights - See How We Found These Jobs
                </summary>
                <div style={{ marginTop: 16, fontSize: 14 }}>
                  <div style={{
                    padding: '16px',
                    background: 'white',
                    borderRadius: '12px',
                    marginBottom: '12px'
                  }}>
                    <strong style={{ color: '#92400e', display: 'block', marginBottom: '8px' }}>
                      🔍 Search Terms Expanded:
                    </strong>
                    <div style={{ color: '#78350f', lineHeight: '1.6' }}>
                      {agentInsights.expansion.expandedTerms?.slice(0, 10).join(', ')}
                    </div>
                  </div>
                  {agentInsights.expansion.reasoning && (
                    <div style={{
                      padding: '16px',
                      background: 'white',
                      borderRadius: '12px',
                      border: '1px solid #fed7aa'
                    }}>
                      <strong style={{ color: '#92400e', display: 'block', marginBottom: '8px' }}>
                        🧠 Agent Reasoning:
                      </strong>
                      <div style={{ color: '#78350f', lineHeight: '1.6', fontSize: '13px' }}>
                        {agentInsights.expansion.reasoning}
                      </div>
                    </div>
                  )}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '60px 40px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
          }}>
            <div style={{
              width: '60px',
              height: '60px',
              border: '4px solid #e2e8f0',
              borderTopColor: '#667eea',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 20px'
            }} />
            <h3 style={{ color: '#1e293b', marginBottom: '8px' }}>Searching for Perfect Jobs...</h3>
            <p style={{ color: '#64748b', margin: 0 }}>Our AI is analyzing thousands of opportunities</p>
          </div>
        )}
        
        {/* Empty State */}
        {!loading && jobs.length === 0 && !showUploadModal && (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            padding: '60px 40px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
          }}>
            {noJobsMessage ? (
              <>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔍</div>
                <h3 style={{ fontSize: '24px', color: '#1e293b', marginBottom: '12px' }}>No Jobs Found</h3>
                <p style={{ color: '#64748b', fontSize: '16px', lineHeight: '1.6', maxWidth: '500px', margin: '0 auto' }}>
                  {noJobsMessage}
                </p>
              </>
            ) : (!user?.skills || user.skills.length === 0) ? (
              <>
                <div style={{ fontSize: '56px', marginBottom: '8px' }}>👋</div>
                <h3 style={{ fontSize: '26px', color: '#1e293b', marginBottom: '8px' }}>Welcome to HireFlow — let's set you up</h3>
                <p style={{ color: '#64748b', fontSize: '16px', marginBottom: '28px' }}>Three quick steps to your first personalized matches.</p>
                <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 28 }}>
                  {[
                    { n: 1, icon: '📄', t: 'Upload your résumé', d: 'We read it in your browser — your file stays private.' },
                    { n: 2, icon: '✨', t: 'We auto-fill your skills', d: 'Skills, GitHub & LinkedIn pulled automatically.' },
                    { n: 3, icon: '🎯', t: 'See matched jobs', d: 'Ranked by how well they fit you.' },
                  ].map((s) => (
                    <div key={s.n} style={{ flex: '1 1 200px', maxWidth: 240, background: '#f8fafc', borderRadius: 14, padding: 20, textAlign: 'left', border: '1px solid #e2e8f0' }}>
                      <div style={{ fontSize: 28 }}>{s.icon}</div>
                      <div style={{ fontWeight: 700, color: '#1e293b', marginTop: 8 }}>{s.n}. {s.t}</div>
                      <div style={{ color: '#64748b', fontSize: 13, marginTop: 4, lineHeight: 1.5 }}>{s.d}</div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setShowUploadModal(true)}
                  style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', border: 'none', padding: '14px 32px', borderRadius: 12, cursor: 'pointer', fontSize: 16, fontWeight: 700, boxShadow: '0 4px 15px rgba(102,126,234,0.4)' }}
                >
                  📄 Upload résumé & get started
                </button>
                <div style={{ marginTop: 14 }}>
                  <button onClick={() => setShowUploadModal(true)} style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                    or enter your skills manually →
                  </button>
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚀</div>
                <h3 style={{ fontSize: '24px', color: '#1e293b', marginBottom: '12px' }}>
                  Ready to find your next opportunity?
                </h3>
                <p style={{ color: '#64748b', fontSize: '16px', marginBottom: '24px' }}>
                  Click "Find Jobs" to see personalized job matches based on your skills
                </p>
                <button
                  onClick={handleFindJobs}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '14px 32px',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.6)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 15px rgba(102, 126, 234, 0.4)';
                  }}
                >
                  🔍 Start Searching
                </button>
              </>
            )}
          </div>
        )}
        
        {/* Search + filters */}
        {jobs.length > 0 && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 16 }}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="🔎 Search title, company, skill…"
              style={{ flex: '1 1 260px', minWidth: 200, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14 }}
            />
            <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#334155', background: 'white' }}>
              <option value="">All sources</option>
              {sources.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, color: '#334155', background: 'white' }}>
              <option value="">All types</option>
              {jobTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            {(query || sourceFilter || typeFilter) && (
              <button onClick={() => { setQuery(''); setSourceFilter(''); setTypeFilter(''); }} style={{ padding: '10px 14px', border: 'none', borderRadius: 10, background: '#f1f5f9', color: '#475569', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
                Clear
              </button>
            )}
            <span style={{ color: '#64748b', fontSize: 13, marginLeft: 'auto' }}>
              Showing {Math.min(visibleCount, filteredJobs.length)} of {filteredJobs.length}
            </span>
          </div>
        )}

        {/* Jobs List */}
        <div>
          {visibleJobs.map(job => <JobCard key={job.id} job={job} />)}
        </div>

        {jobs.length > 0 && filteredJobs.length === 0 && (
          <div style={{ textAlign: 'center', color: '#64748b', padding: '32px 0' }}>
            No jobs match your filters. <button onClick={() => { setQuery(''); setSourceFilter(''); setTypeFilter(''); }} style={{ background: 'none', border: 'none', color: '#667eea', cursor: 'pointer', fontWeight: 600 }}>Clear filters</button>
          </div>
        )}

        {visibleCount < filteredJobs.length && (
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <button onClick={() => setVisibleCount(c => c + PAGE)} style={{ padding: '12px 28px', border: '2px solid #667eea', borderRadius: 10, background: 'white', color: '#667eea', cursor: 'pointer', fontSize: 15, fontWeight: 600 }}>
              Load more ({filteredJobs.length - visibleCount} left)
            </button>
          </div>
        )}
      </div>

      {showUploadModal && (
        <ResumeUploadModal 
          onClose={() => setShowUploadModal(false)}
          onUploaded={handleResumeUploaded}
        />
      )}

      {showPreferencesModal && (
        <JobPreferencesModal
          onClose={() => setShowPreferencesModal(false)}
          onSave={handleSavePreferences}
        />
      )}

      <style jsx>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-30px);
          }
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
