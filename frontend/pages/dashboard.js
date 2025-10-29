import { useEffect, useState } from 'react';
import { getToken, getUser, fetchJobs, updateProfile, saveUser } from '../lib/api';
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

  useEffect(()=>{
    const token = getToken();
    const userData = getUser();
    if (!token) { router.push('/login'); return; }
    
    setUser(userData);
    // Check if user has resume
    if (userData?.resumeId) {
      setHasResume(true);
    }
  },[]);

  async function handleFindJobs() {
    const token = getToken();
    if (!token) { router.push('/login'); return; }
    
    // Check if user has set job preferences (skills or preferredJobTypes)
    if ((!user?.skills || user.skills.length === 0) && (!user?.preferredJobTypes || user.preferredJobTypes.length === 0)) {
      setShowPreferencesModal(true);
      return;
    }
    
    // Fetch jobs
    setLoading(true);
    setNoJobsMessage('');
    try {
      const res = await fetchJobs(token);
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
      alert('Failed to fetch jobs. Please try again.');
    }
    setLoading(false);
  }

  async function handleSavePreferences(preferences) {
    const token = getToken();
    if (!token) return;
    
    try {
      const res = await updateProfile(token, preferences);
      if (res.user) {
        const updatedUser = { ...user, ...res.user };
        setUser(updatedUser);
        saveUser(updatedUser);
        setShowPreferencesModal(false);
        
        // Automatically fetch jobs after saving preferences
        setTimeout(() => handleFindJobs(), 500);
      } else {
        alert(res.error || 'Failed to save preferences');
      }
    } catch (err) {
      console.error('Failed to save preferences:', err);
      alert('Failed to save preferences. Please try again.');
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
        
        {/* Jobs List */}
        <div>
          {jobs.map(job => <JobCard key={job.id} job={job} />)}
        </div>
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
