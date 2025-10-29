import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getToken, getUser, getApplications } from '../lib/api';
import InterviewPrepModal from '../components/InterviewPrepModal';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showInterviewPrep, setShowInterviewPrep] = useState(false);

  useEffect(() => {
    const token = getToken();
    const userData = getUser();
    
    if (!token) {
      router.push('/login');
      return;
    }

    setUser(userData);
    loadApplications(token);
  }, []);

  async function loadApplications(token) {
    setLoading(true);
    try {
      const res = await getApplications(token);
      if (res.applications) {
        setApplications(res.applications);
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
    }
    setLoading(false);
  }

  function handlePrepareInterview(application) {
    setSelectedApplication(application);
    setShowInterviewPrep(true);
  }

  function getStatusColor(status) {
    const colors = {
      pending: '#f59e0b',
      in_progress: '#3b82f6',
      success: '#10b981',
      failed: '#ef4444',
      timeout: '#6b7280'
    };
    return colors[status] || '#6b7280';
  }

  function getStatusEmoji(status) {
    const emojis = {
      pending: '⏳',
      in_progress: '🔄',
      success: '✅',
      failed: '❌',
      timeout: '⏱️'
    };
    return emojis[status] || '📝';
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8fafc 0%, #e0e7ff 50%, #fce7f3 100%)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Background shapes */}
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
          <div>
            <h1 style={{
              margin: 0,
              fontSize: '28px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              👤 My Profile
            </h1>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>
              Track your applications and prepare for interviews
            </p>
          </div>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '10px',
              cursor: 'pointer',
              fontSize: '14px',
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
            ← Back to Dashboard
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '30px 20px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* User Info Card */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '32px',
          marginBottom: '30px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '24px' }}>
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              color: 'white',
              fontWeight: 'bold'
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>{user?.name}</h2>
              <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '16px' }}>{user?.email}</p>
              {user?.location && (
                <p style={{ margin: '4px 0 0', color: '#667eea', fontSize: '14px' }}>
                  📍 {user.location}
                </p>
              )}
            </div>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px',
            padding: '20px',
            background: '#f8fafc',
            borderRadius: '12px'
          }}>
            {user?.skills && user.skills.length > 0 && (
              <div>
                <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px', fontWeight: '600' }}>
                  💼 Skills
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {user.skills.slice(0, 8).map((skill, idx) => (
                    <span key={idx} style={{
                      padding: '4px 12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: '500'
                    }}>
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {user?.preferredJobTypes && user.preferredJobTypes.length > 0 && (
              <div>
                <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px', fontWeight: '600' }}>
                  🎯 Job Preferences
                </div>
                <div style={{ fontSize: '14px', color: '#1e293b' }}>
                  {user.preferredJobTypes.join(', ')}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Applications Section */}
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '32px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px'
          }}>
            <h2 style={{ margin: 0, fontSize: '22px', color: '#1e293b' }}>
              📋 My Applications ({applications.length})
            </h2>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{
                width: '50px',
                height: '50px',
                border: '4px solid #e2e8f0',
                borderTopColor: '#667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }} />
              <p style={{ color: '#64748b' }}>Loading applications...</p>
            </div>
          ) : applications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{ fontSize: '64px', marginBottom: '16px' }}>📝</div>
              <h3 style={{ fontSize: '20px', color: '#1e293b', marginBottom: '8px' }}>
                No Applications Yet
              </h3>
              <p style={{ color: '#64748b', marginBottom: '24px' }}>
                Start applying to jobs to track them here!
              </p>
              <button
                onClick={() => router.push('/dashboard')}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                }}
              >
                Find Jobs
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {applications.map((app) => (
                <div
                  key={app._id}
                  style={{
                    border: '2px solid #e2e8f0',
                    borderRadius: '16px',
                    padding: '24px',
                    transition: 'all 0.3s ease',
                    background: 'white'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#667eea';
                    e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'start',
                    gap: '20px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        marginBottom: '8px',
                        flexWrap: 'wrap'
                      }}>
                        <h3 style={{ margin: 0, fontSize: '20px', color: '#1e293b' }}>
                          {app.jobTitle}
                        </h3>
                        <span style={{
                          padding: '4px 12px',
                          borderRadius: '20px',
                          fontSize: '13px',
                          fontWeight: 'bold',
                          background: `${getStatusColor(app.status)}20`,
                          color: getStatusColor(app.status),
                          border: `1.5px solid ${getStatusColor(app.status)}`
                        }}>
                          {getStatusEmoji(app.status)} {app.status}
                        </span>
                      </div>
                      
                      <div style={{ color: '#64748b', fontSize: '15px', marginBottom: '12px' }}>
                        🏢 {app.companyName}
                      </div>

                      <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                        Applied: {new Date(app.appliedAt || app.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                    </div>

                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      minWidth: '180px'
                    }}>
                      <button
                        onClick={() => handlePrepareInterview(app)}
                        style={{
                          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                          color: 'white',
                          border: 'none',
                          padding: '10px 20px',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                          transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                        }}
                      >
                        🎯 Prepare Interview
                      </button>
                      
                      {app.applyUrl && (
                        <button
                          onClick={() => window.open(app.applyUrl, '_blank')}
                          style={{
                            background: 'white',
                            color: '#667eea',
                            border: '2px solid #667eea',
                            padding: '10px 20px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: '600',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#667eea';
                            e.target.style.color = 'white';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = 'white';
                            e.target.style.color = '#667eea';
                          }}
                        >
                          🔗 View Job
                        </button>
                      )}
                    </div>
                  </div>

                  {app.interviewPrep?.preparedAt && (
                    <div style={{
                      marginTop: '16px',
                      padding: '12px 16px',
                      background: '#dcfce7',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#166534',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      ✅ Interview prep completed on{' '}
                      {new Date(app.interviewPrep.preparedAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showInterviewPrep && selectedApplication && (
        <InterviewPrepModal
          application={selectedApplication}
          onClose={() => {
            setShowInterviewPrep(false);
            setSelectedApplication(null);
            // Reload applications to get updated interview prep data
            const token = getToken();
            if (token) loadApplications(token);
          }}
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
