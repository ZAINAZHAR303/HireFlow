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
    <div className="container">
      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20}}>
        <div>
          <h1>Welcome, {user?.name}!</h1>
          <p className="muted">
            {hasResume || (user?.skills && user.skills.length > 0)
              ? `Skills: ${user?.skills?.join(', ') || 'None set'}`
              : 'Upload your resume to get personalized job recommendations'}
          </p>
          {user?.preferredJobTypes && user.preferredJobTypes.length > 0 && (
            <p className="muted" style={{fontSize: 13, marginTop: 4}}>
              📍 Looking for: {user.preferredJobTypes.join(', ')}
              {user?.preferredLocations && user.preferredLocations.length > 0 && (
                <span> in {user.preferredLocations.join(', ')}</span>
              )}
            </p>
          )}
        </div>
        <div style={{display: 'flex', gap: 12}}>
          <button onClick={() => setShowUploadModal(true)} style={{background: '#666'}}>
            {hasResume ? 'Update Profile' : 'Setup Profile'}
          </button>
          <button onClick={handleFindJobs} disabled={loading}>
            {loading ? 'Searching...' : '🔍 Find Jobs'}
          </button>
        </div>
      </div>

      {jobs.length > 0 && (
        <div style={{marginBottom: 12}}>
          <div style={{padding: 12, background: '#f0f9ff', borderRadius: 8, marginBottom: 8}}>
            <strong>Found {jobs.length} matching jobs</strong>
            {user?.skills && user.skills.length > 0 && (
              <span className="muted"> based on your skills: {user.skills.slice(0, 5).join(', ')}</span>
            )}
            {agentInsights?.used && (
              <span style={{marginLeft: 8, color: '#10b981', fontSize: 14}}>🤖 AI Agent Active</span>
            )}
          </div>
          
          {agentInsights?.used && agentInsights.expansion && (
            <details style={{marginBottom: 12, padding: 12, background: '#fefce8', borderRadius: 8, border: '1px solid #fde047'}}>
              <summary style={{cursor: 'pointer', fontWeight: 'bold', color: '#854d0e'}}>💡 AI Agent Insights</summary>
              <div style={{marginTop: 12, fontSize: 14}}>
                <div style={{marginBottom: 8}}>
                  <strong>Search Terms Expanded:</strong>
                  <div className="muted">{agentInsights.expansion.expandedTerms?.slice(0, 10).join(', ')}</div>
                </div>
                {agentInsights.expansion.reasoning && (
                  <div style={{marginTop: 8, padding: 8, background: 'white', borderRadius: 4, fontSize: 13}}>
                    <strong>Agent Reasoning:</strong> {agentInsights.expansion.reasoning}
                  </div>
                )}
              </div>
            </details>
          )}
        </div>
      )}

      <div>
        {loading && <div className="card">Searching for jobs...</div>}
        {!loading && jobs.length === 0 && !showUploadModal && (
          <div className="card" style={{textAlign: 'center', padding: 40}}>
            {noJobsMessage ? (
              <>
                <h3>No Jobs Found</h3>
                <p className="muted">{noJobsMessage}</p>
              </>
            ) : (
              <>
                <h3>Ready to find your next opportunity?</h3>
                <p className="muted">Click "Find Jobs" to see personalized job matches</p>
              </>
            )}
          </div>
        )}
        {jobs.map(job=> <JobCard key={job.id} job={job} />)}
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
    </div>
  );
}
