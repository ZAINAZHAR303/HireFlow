import { useState, useEffect } from 'react';
import { getToken, generateInterviewPrep, generateCoverLetter, getUser, getApplication } from '../lib/api';

export default function InterviewPrepModal({ application, onClose }) {
  const [loading, setLoading] = useState(false);
  const [interviewPrep, setInterviewPrep] = useState(application.interviewPrep || null);
  const [coverLetter, setCoverLetter] = useState(application.coverLetter || null);
  const [loadingCoverLetter, setLoadingCoverLetter] = useState(false);
  const [activeTab, setActiveTab] = useState('questions'); // questions, company, coverLetter
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  useEffect(() => {
    console.log('🔍 InterviewPrepModal mounted with application:', {
      hasInterviewPrep: !!application.interviewPrep,
      questionsCount: application.interviewPrep?.questions?.length || 0,
      hasMetadata: !!application.metadata,
      hasJobDescription: !!application.metadata?.jobDescription,
      jobDescriptionLength: application.metadata?.jobDescription?.length || 0
    });
    
    // Generate if no interviewPrep OR if questions array is empty
    if (!application.interviewPrep || !application.interviewPrep.questions || application.interviewPrep.questions.length === 0) {
      console.log('🚀 Generating interview prep (missing or empty)');
      handleGenerateInterviewPrep();
    }
  }, []);

  async function handleGenerateInterviewPrep() {
    setLoading(true);
    try {
      const token = getToken();
      const jobDescription = application.metadata?.jobDescription || 
                            application.description ||
                            '';

      console.log('📋 Generating interview prep for role:', {
        applicationId: application._id,
        jobTitle: application.jobTitle,
        companyName: application.companyName
      });

      const res = await generateInterviewPrep(token, {
        applicationId: application._id,
        jobDescription: jobDescription || `Generate interview questions for ${application.jobTitle} role.`,
        jobTitle: application.jobTitle,
        companyName: application.companyName
      });

      if (res.interviewPrep) {
        console.log('✅ Received interview prep:', {
          questionsCount: res.interviewPrep.questions?.length || 0,
          hasCompanyResearch: !!res.interviewPrep.companyResearch,
          cached: res.cached
        });
        setInterviewPrep(res.interviewPrep);
        
        // Refetch application to get updated data from database
        try {
          const appRes = await getApplication(token, application._id);
          if (appRes.application && appRes.application.interviewPrep) {
            setInterviewPrep(appRes.application.interviewPrep);
            if (appRes.application.coverLetter) {
              setCoverLetter(appRes.application.coverLetter);
            }
          }
        } catch (err) {
          console.log('Could not refetch application:', err);
        }
      } else {
        alert(res.error || 'Failed to generate interview preparation');
      }
    } catch (err) {
      console.error('Failed to generate interview prep:', err);
      alert('Failed to generate interview preparation');
    }
    setLoading(false);
  }

  async function handleGenerateCoverLetter() {
    setLoadingCoverLetter(true);
    try {
      const token = getToken();
      const user = getUser();
      const jobDescription = application.metadata?.jobDescription || '';

      const res = await generateCoverLetter(token, {
        applicationId: application._id,
        jobDescription,
        jobTitle: application.jobTitle,
        companyName: application.companyName,
        userSkills: user?.skills || [],
        userName: user?.name || 'Candidate'
      });

      if (res.coverLetter) {
        setCoverLetter(res.coverLetter);
        setActiveTab('coverLetter');
        
        // Refetch application to get updated data from database
        try {
          const appRes = await getApplication(token, application._id);
          if (appRes.application && appRes.application.coverLetter) {
            setCoverLetter(appRes.application.coverLetter);
          }
        } catch (err) {
          console.log('Could not refetch application:', err);
        }
      } else {
        alert(res.error || 'Failed to generate cover letter');
      }
    } catch (err) {
      console.error('Failed to generate cover letter:', err);
      alert('Failed to generate cover letter');
    }
    setLoadingCoverLetter(false);
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    alert('✅ Copied to clipboard!');
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px',
      overflow: 'auto'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '20px',
        maxWidth: '900px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '24px',
          borderRadius: '20px 20px 0 0'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '24px', marginBottom: '8px' }}>
                🎯 Interview Preparation
              </h2>
              <p style={{ margin: 0, fontSize: '16px', opacity: 0.9 }}>
                {application.jobTitle} at {application.companyName}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.3)';
                e.target.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.2)';
                e.target.style.transform = 'scale(1)';
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '2px solid #e2e8f0',
          background: '#f8fafc'
        }}>
          <button
            onClick={() => setActiveTab('questions')}
            style={{
              flex: 1,
              padding: '16px',
              border: 'none',
              background: activeTab === 'questions' ? 'white' : 'transparent',
              borderBottom: activeTab === 'questions' ? '3px solid #667eea' : 'none',
              color: activeTab === 'questions' ? '#667eea' : '#64748b',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '15px',
              transition: 'all 0.2s'
            }}
          >
            📝 Practice Questions
          </button>
          <button
            onClick={() => setActiveTab('company')}
            style={{
              flex: 1,
              padding: '16px',
              border: 'none',
              background: activeTab === 'company' ? 'white' : 'transparent',
              borderBottom: activeTab === 'company' ? '3px solid #667eea' : 'none',
              color: activeTab === 'company' ? '#667eea' : '#64748b',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '15px',
              transition: 'all 0.2s'
            }}
          >
            🏢 Company Research
          </button>
          <button
            onClick={() => {
              if (!coverLetter) {
                handleGenerateCoverLetter();
              } else {
                setActiveTab('coverLetter');
              }
            }}
            style={{
              flex: 1,
              padding: '16px',
              border: 'none',
              background: activeTab === 'coverLetter' ? 'white' : 'transparent',
              borderBottom: activeTab === 'coverLetter' ? '3px solid #667eea' : 'none',
              color: activeTab === 'coverLetter' ? '#667eea' : '#64748b',
              fontWeight: '600',
              cursor: 'pointer',
              fontSize: '15px',
              transition: 'all 0.2s'
            }}
          >
            ✍️ Cover Letter
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflow: 'auto',
          padding: '24px'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <div style={{
                width: '60px',
                height: '60px',
                border: '4px solid #e2e8f0',
                borderTopColor: '#667eea',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 20px'
              }} />
              <h3 style={{ color: '#1e293b', marginBottom: '8px' }}>
                Generating Interview Preparation...
              </h3>
              <p style={{ color: '#64748b', margin: 0 }}>
                AI is analyzing the job and creating personalized questions
              </p>
            </div>
          ) : activeTab === 'questions' && interviewPrep?.questions ? (
            <div>
              <div style={{
                background: '#dbeafe',
                border: '1px solid #3b82f6',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px'
              }}>
                <strong>💡 How to use:</strong>
                <p style={{ margin: '8px 0 0', fontSize: '14px', lineHeight: '1.6' }}>
                  Practice answering these questions out loud. Click any question to see a sample STAR method answer.
                </p>
              </div>

              {/* Debug info */}
              {interviewPrep.questions.length === 0 && (
                <div style={{
                  background: '#fef3c7',
                  border: '1px solid #fbbf24',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '24px'
                }}>
                  <strong>⚠️ Debug Info:</strong>
                  <p style={{ margin: '8px 0 0', fontSize: '13px' }}>
                    Questions array exists but is empty. interviewPrep: {JSON.stringify(interviewPrep)}
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {interviewPrep.questions.map((q, idx) => (
                  <div
                    key={idx}
                    style={{
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      padding: '20px',
                      background: expandedQuestion === idx ? '#f8fafc' : 'white',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => setExpandedQuestion(expandedQuestion === idx ? null : idx)}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      gap: '12px'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: 'bold',
                            background: q.category === 'behavioral' ? '#dbeafe' : 
                                       q.category === 'technical' ? '#fef3c7' : '#dcfce7',
                            color: q.category === 'behavioral' ? '#1e40af' :
                                   q.category === 'technical' ? '#92400e' : '#166534'
                          }}>
                            {q.category === 'behavioral' ? '🧠 Behavioral' :
                             q.category === 'technical' ? '⚙️ Technical' : '💼 General'}
                          </span>
                          <span style={{ color: '#94a3b8', fontSize: '14px' }}>
                            Question {idx + 1}/{interviewPrep.questions.length}
                          </span>
                        </div>
                        <h3 style={{
                          margin: 0,
                          fontSize: '17px',
                          color: '#1e293b',
                          lineHeight: '1.5'
                        }}>
                          {q.question}
                        </h3>
                      </div>
                      <button
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#667eea',
                          fontSize: '20px',
                          cursor: 'pointer',
                          transition: 'transform 0.3s',
                          transform: expandedQuestion === idx ? 'rotate(180deg)' : 'rotate(0)'
                        }}
                      >
                        ▼
                      </button>
                    </div>

                    {expandedQuestion === idx && (
                      <div style={{
                        marginTop: '16px',
                        padding: '16px',
                        background: 'white',
                        borderRadius: '8px',
                        border: '1px solid #e2e8f0'
                      }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#667eea',
                          marginBottom: '12px'
                        }}>
                          📚 Sample STAR Answer:
                        </div>
                        <div style={{
                          fontSize: '14px',
                          color: '#475569',
                          lineHeight: '1.7',
                          whiteSpace: 'pre-wrap'
                        }}>
                          {q.answer}
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(q.answer);
                          }}
                          style={{
                            marginTop: '12px',
                            padding: '8px 16px',
                            background: '#667eea',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: '600'
                          }}
                        >
                          📋 Copy Answer
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === 'company' && interviewPrep?.companyResearch ? (
            <div>
              <div style={{
                background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                border: '1px solid #bae6fd',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h3 style={{
                  margin: '0 0 12px 0',
                  fontSize: '20px',
                  color: '#0c4a6e'
                }}>
                  About {application.companyName}
                </h3>
                <p style={{
                  margin: 0,
                  fontSize: '15px',
                  color: '#075985',
                  lineHeight: '1.6'
                }}>
                  {interviewPrep.companyResearch.summary}
                </p>
              </div>

              {interviewPrep.companyResearch.keyFacts && interviewPrep.companyResearch.keyFacts.length > 0 && (
                <div style={{
                  background: 'white',
                  border: '2px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '24px'
                }}>
                  <h3 style={{
                    margin: '0 0 16px 0',
                    fontSize: '18px',
                    color: '#1e293b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    🔍 Key Facts
                  </h3>
                  <ul style={{
                    margin: 0,
                    paddingLeft: '24px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}>
                    {interviewPrep.companyResearch.keyFacts.map((fact, idx) => (
                      <li key={idx} style={{
                        fontSize: '15px',
                        color: '#475569',
                        lineHeight: '1.6'
                      }}>
                        {fact}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {interviewPrep.companyResearch.culture && (
                <div style={{
                  background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                  border: '1px solid #fde047',
                  borderRadius: '16px',
                  padding: '24px',
                  marginBottom: '24px'
                }}>
                  <h3 style={{
                    margin: '0 0 12px 0',
                    fontSize: '18px',
                    color: '#78350f',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    🌟 Company Culture
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: '15px',
                    color: '#92400e',
                    lineHeight: '1.6'
                  }}>
                    {interviewPrep.companyResearch.culture}
                  </p>
                </div>
              )}

              {interviewPrep.companyResearch.recentNews && (
                <div style={{
                  background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                  border: '1px solid #86efac',
                  borderRadius: '16px',
                  padding: '24px'
                }}>
                  <h3 style={{
                    margin: '0 0 12px 0',
                    fontSize: '18px',
                    color: '#166534',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    📰 Recent News & Trends
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: '15px',
                    color: '#15803d',
                    lineHeight: '1.6'
                  }}>
                    {interviewPrep.companyResearch.recentNews}
                  </p>
                </div>
              )}

              <button
                onClick={() => {
                  const text = `About ${application.companyName}\n\n${interviewPrep.companyResearch.summary}\n\nKey Facts:\n${interviewPrep.companyResearch.keyFacts?.join('\n') || ''}\n\nCulture:\n${interviewPrep.companyResearch.culture}\n\nRecent News:\n${interviewPrep.companyResearch.recentNews}`;
                  copyToClipboard(text);
                }}
                style={{
                  marginTop: '24px',
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                }}
              >
                📋 Copy All Research
              </button>
            </div>
          ) : activeTab === 'coverLetter' ? (
            loadingCoverLetter ? (
              <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <div style={{
                  width: '60px',
                  height: '60px',
                  border: '4px solid #e2e8f0',
                  borderTopColor: '#667eea',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto 20px'
                }} />
                <h3 style={{ color: '#1e293b', marginBottom: '8px' }}>
                  Generating Cover Letter...
                </h3>
                <p style={{ color: '#64748b', margin: 0 }}>
                  AI is creating a personalized cover letter for you
                </p>
              </div>
            ) : coverLetter ? (
              <div>
                <div style={{
                  background: '#dbeafe',
                  border: '1px solid #3b82f6',
                  borderRadius: '12px',
                  padding: '16px',
                  marginBottom: '24px'
                }}>
                  <strong>💡 Tip:</strong>
                  <p style={{ margin: '8px 0 0', fontSize: '14px', lineHeight: '1.6' }}>
                    Review and customize this cover letter before sending. Make sure to add specific examples from your experience.
                  </p>
                </div>

                <div style={{
                  background: 'white',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '32px',
                  marginBottom: '24px',
                  fontFamily: 'Georgia, serif',
                  fontSize: '15px',
                  lineHeight: '1.8',
                  color: '#1e293b',
                  whiteSpace: 'pre-wrap'
                }}>
                  {coverLetter}
                </div>

                <button
                  onClick={() => copyToClipboard(coverLetter)}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '16px',
                    fontWeight: '600',
                    boxShadow: '0 4px 15px rgba(102, 126, 234, 0.4)'
                  }}
                >
                  📋 Copy Cover Letter
                </button>
              </div>
            ) : null
          ) : (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
              <p style={{ color: '#64748b', marginBottom: '16px' }}>
                {activeTab === 'questions' ? 
                  `No questions available. interviewPrep: ${JSON.stringify(interviewPrep)}` : 
                  activeTab === 'company' ? 
                    'No company research available' : 
                    'No data available'
                }
              </p>
              {activeTab === 'questions' && (
                <button
                  onClick={handleGenerateInterviewPrep}
                  style={{
                    padding: '12px 24px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  🔄 Generate Questions
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
