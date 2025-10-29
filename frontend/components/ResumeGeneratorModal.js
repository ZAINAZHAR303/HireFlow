import { useState } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import SmartApplyHelper from './SmartApplyHelper';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4001';

export default function ResumeGeneratorModal({ job, onClose }) {
  const [tone, setTone] = useState('professional');
  const [loading, setLoading] = useState(false);
  const [generatedResume, setGeneratedResume] = useState(null);
  const [parsedJobData, setParsedJobData] = useState(null);
  
  // Smart Apply Helper state
  const [showSmartHelper, setShowSmartHelper] = useState(false);
  
  // Auto-Apply states (legacy - can be removed later)
  const [showApplyFlow, setShowApplyFlow] = useState(false);
  const [applyLoading, setApplyLoading] = useState(false);
  const [applyStatus, setApplyStatus] = useState(null);
  const [detectedFields, setDetectedFields] = useState(null);
  const [missingFields, setMissingFields] = useState([]);
  const [userInputs, setUserInputs] = useState({});

  // Convert HTML to plain text
  const htmlToPlainText = (html) => {
    if (!html) return '';
    
    let text = html;
    
    // Convert common HTML tags to plain text equivalents
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n\n');
    text = text.replace(/<\/div>/gi, '\n');
    text = text.replace(/<\/li>/gi, '\n');
    text = text.replace(/<li[^>]*>/gi, '• ');
    text = text.replace(/<ul[^>]*>/gi, '\n');
    text = text.replace(/<\/ul>/gi, '\n');
    text = text.replace(/<strong>/gi, '');
    text = text.replace(/<\/strong>/gi, '');
    text = text.replace(/<em>/gi, '');
    text = text.replace(/<\/em>/gi, '');
    text = text.replace(/<b>/gi, '');
    text = text.replace(/<\/b>/gi, '');
    text = text.replace(/<i>/gi, '');
    text = text.replace(/<\/i>/gi, '');
    
    // Remove all remaining HTML tags
    text = text.replace(/<[^>]*>/g, '');
    
    // Decode HTML entities
    text = text.replace(/&amp;/g, '&');
    text = text.replace(/&lt;/g, '<');
    text = text.replace(/&gt;/g, '>');
    text = text.replace(/&quot;/g, '"');
    text = text.replace(/&#39;/g, "'");
    text = text.replace(/&nbsp;/g, ' ');
    
    // Clean up extra whitespace
    text = text.replace(/\n\s*\n\s*\n/g, '\n\n'); // Max 2 newlines
    text = text.trim();
    
    return text;
  };

  // Convert markdown to plain text with bold headings
  const markdownToPlainText = (markdown) => {
    if (!markdown) return '';
    
    let text = markdown;
    
    // Remove code fences
    text = text.replace(/```markdown\n/g, '');
    text = text.replace(/```\n/g, '');
    text = text.replace(/```/g, '');
    
    // Common section headers - make them bold with extra spacing
    const sectionHeaders = [
      'Professional Summary', 'Key Skills', 'Experience', 'Education', 
      'Projects', 'Certifications', 'Awards', 'Publications',
      'Extracurricular & Volunteer Experience', 'Technical Skills',
      'Languages', 'Interests', 'References', 'Achievements'
    ];
    
    sectionHeaders.forEach(header => {
      const regex = new RegExp(`^${header}$`, 'gm');
      text = text.replace(regex, `<bold>${header}</bold>`);
    });
    
    // Remove remaining markdown headers but keep bold tags
    text = text.replace(/^### (.+)$/gm, '<bold>$1</bold>');     // H3
    text = text.replace(/^## (.+)$/gm, '<bold>$1</bold>');      // H2
    text = text.replace(/^# (.+)$/gm, '$1');                    // H1 (name - keep as is)
    
    // Remove bold/italic markdown
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '$1'); // bold+italic
    text = text.replace(/\*\*(.+?)\*\*/g, '$1');     // bold
    text = text.replace(/\*(.+?)\*/g, '$1');         // italic
    text = text.replace(/__(.+?)__/g, '$1');         // bold
    text = text.replace(/_(.+?)_/g, '$1');           // italic
    
    // Convert bullet points to bullets
    text = text.replace(/^\* /gm, '  • ');
    text = text.replace(/^- /gm, '  • ');
    text = text.replace(/^\+ /gm, '  • ');
    
    // Remove links but keep text
    text = text.replace(/\[(.+?)\]\(.+?\)/g, '$1');
    
    // Remove inline code
    text = text.replace(/`(.+?)`/g, '$1');
    
    return text;
  };

  // Render text with bold sections
  const renderFormattedText = (text) => {
    const parts = text.split(/(<bold>.*?<\/bold>)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('<bold>') && part.endsWith('</bold>')) {
        const content = part.replace(/<\/?bold>/g, '');
        return <strong key={index} style={{ 
          display: 'block',
          fontSize: 16,
          marginTop: index === 0 ? 0 : 24,
          marginBottom: 12,
          letterSpacing: 0.3
        }}>{content}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('hf_token');
      const res = await axios.post(
        `${API_BASE}/resume-generator/generate-resume`,
        {
          jobId: job.id,
          jobTitle: job.title,
          jobCompany: job.company_name,
          jobDescription: job.description,
          tone
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setGeneratedResume(res.data.resume.content);
      setParsedJobData(res.data.resume.parsedJobData);
      
      // Save data for Smart Apply Helper and bookmarklet
      const user = JSON.parse(localStorage.getItem('hf_user') || '{}');
      const autofillData = {
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        linkedin: user.linkedin || '',
        portfolio: user.portfolio || '',
        github: user.github || '',
        resume: res.data.resume.content,
        jobTitle: job.title,
        companyName: job.company_name,
        timestamp: new Date().toISOString()
      };
      localStorage.setItem('hireflow_autofill_data', JSON.stringify(autofillData));
    } catch (err) {
      console.error('Resume generation error:', err);
      const errorMessage = err.response?.data?.message || err.message;
      
      if (errorMessage.includes('overloaded') || errorMessage.includes('503')) {
        alert('⚠️ AI service is temporarily busy. Please try again in a few seconds.');
      } else if (errorMessage.includes('token limit')) {
        alert('⚠️ Job description or resume is too long. Please try with a shorter version.');
      } else {
        alert('❌ Failed to generate resume: ' + errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedResume);
    alert('Resume copied to clipboard!');
  };

  const handleDownload = () => {
    const blob = new Blob([generatedResume], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${job.company_name}_${job.title.replace(/\s+/g, '_')}_Resume.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPDF = async () => {
    try {
      const token = localStorage.getItem('hf_token');
      const user = JSON.parse(localStorage.getItem('hf_user') || '{}');
      
      const res = await axios.post(
        `${API_BASE}/resume-generator/download-resume-pdf`,
        {
          resumeContent: generatedResume,
          candidateName: user.name || 'Candidate'
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      // Create download link
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${job.company_name}_${job.title.replace(/\s+/g, '_')}_Resume.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('PDF download error:', err);
      alert('Failed to generate PDF');
    }
  };

  const handleAutoApply = async () => {
    setShowApplyFlow(true);
    setApplyLoading(true);
    
    try {
      const token = localStorage.getItem('hf_token');
      const user = JSON.parse(localStorage.getItem('hf_user') || '{}');
      
      // Step 1: Analyze the application form
      setApplyStatus('Analyzing application form...');
      
      const analyzeRes = await axios.post(
        `${API_BASE}/applications/analyze-form`,
        { applyUrl: job.url },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setDetectedFields(analyzeRes.data.detectedFields);
      
      // Step 2: Check what data we have vs. what's required
      const userData = {
        fullName: user.name,
        email: user.email,
        phone: user.phone,
        linkedin: user.linkedin,
        portfolio: user.portfolio || user.github,
        resume: generatedResume
      };
      
      const missing = [];
      const fields = analyzeRes.data.detectedFields;
      
      if (fields.name?.length > 0 && !userData.fullName) missing.push({ field: 'fullName', label: 'Full Name', type: 'text' });
      if (fields.email?.length > 0 && !userData.email) missing.push({ field: 'email', label: 'Email', type: 'email' });
      if (fields.phone?.length > 0 && !userData.phone) missing.push({ field: 'phone', label: 'Phone Number', type: 'tel' });
      if (fields.linkedin?.length > 0 && !userData.linkedin) missing.push({ field: 'linkedin', label: 'LinkedIn URL', type: 'url' });
      if (fields.portfolio?.length > 0 && !userData.portfolio) missing.push({ field: 'portfolio', label: 'Portfolio/GitHub URL', type: 'url' });
      
      // Add any "other" fields detected
      fields.other?.forEach((field, idx) => {
        missing.push({ 
          field: `custom_${idx}`, 
          label: field.label || `Field ${idx + 1}`, 
          type: field.type || 'text' 
        });
      });
      
      setMissingFields(missing);
      setApplyStatus(missing.length > 0 ? 'Please provide missing information' : 'Ready to apply');
      
    } catch (err) {
      console.error('Auto-apply error:', err);
      setApplyStatus('Failed to analyze form');
      alert(err.response?.data?.message || 'Failed to analyze application form');
    } finally {
      setApplyLoading(false);
    }
  };

  const handleSubmitApplication = async () => {
    setApplyLoading(true);
    setApplyStatus('Filling application form...');
    
    try {
      const token = localStorage.getItem('hf_token');
      const user = JSON.parse(localStorage.getItem('hf_user') || '{}');
      
      const userData = {
        fullName: userInputs.fullName || user.name,
        email: userInputs.email || user.email,
        phone: userInputs.phone || user.phone,
        linkedin: userInputs.linkedin || user.linkedin,
        portfolio: userInputs.portfolio || user.portfolio || user.github,
        ...userInputs // Include any custom fields
      };
      
      const res = await axios.post(
        `${API_BASE}/applications/apply`,
        {
          jobId: job.id,
          jobTitle: job.title,
          companyName: job.company_name,
          applyUrl: job.url,
          userData,
          autoSubmit: false
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setApplyStatus(res.data.status);
      alert(res.data.message);
      
    } catch (err) {
      console.error('Application error:', err);
      setApplyStatus('failed');
      alert(err.response?.data?.message || 'Failed to submit application');
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20
    }}>
      <div style={{
        background: 'white',
        borderRadius: 12,
        width: '95%',
        maxWidth: 1400,
        height: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 24 }}>AI Resume Tailor</h2>
            <p style={{ margin: '4px 0 0', color: '#6b7280', fontSize: 14 }}>
              {job.title} at {job.company_name}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            fontSize: 28,
            cursor: 'pointer',
            color: '#6b7280'
          }}>×</button>
        </div>

        {/* Controls */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e5e7eb',
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          background: '#f9fafb'
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 14, fontWeight: 500 }}>Tone:</span>
            <select
              value={tone}
              onChange={(e) => setTone(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: '1px solid #d1d5db',
                fontSize: 14
              }}
            >
              <option value="professional">Professional</option>
              <option value="concise">Concise</option>
              <option value="enthusiastic">Enthusiastic</option>
              <option value="technical">Technical</option>
            </select>
          </label>

          <button
            onClick={handleGenerate}
            disabled={loading}
            style={{
              padding: '8px 16px',
              background: loading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 500,
              fontSize: 14
            }}
          >
            {loading ? 'Generating...' : generatedResume ? 'Regenerate' : 'Generate Resume'}
          </button>

          {generatedResume && (
            <>
              <button
                onClick={handleCopy}
                style={{
                  padding: '8px 16px',
                  background: 'white',
                  color: '#3b82f6',
                  border: '1px solid #3b82f6',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: 14
                }}
              >
                📋 Copy
              </button>
              <button
                onClick={handleDownloadPDF}
                style={{
                  padding: '8px 16px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: 14
                }}
              >
                📄 Download PDF
              </button>
              <button
                onClick={handleDownload}
                style={{
                  padding: '8px 16px',
                  background: 'white',
                  color: '#10b981',
                  border: '1px solid #10b981',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: 14
                }}
              >
                ⬇️ Download MD
              </button>
              <button
                onClick={() => setShowSmartHelper(true)}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontWeight: 500,
                  fontSize: 14,
                  marginLeft: 'auto'
                }}
              >
                📋 Smart Apply
              </button>
            </>
          )}
        </div>

        {/* Two-panel layout */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* Left Panel - Job Description */}
          <div style={{
            width: '40%',
            borderRight: '1px solid #e5e7eb',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 24px',
              background: '#f3f4f6',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Job Description</h3>
              {parsedJobData && (
                <div style={{ marginTop: 12, fontSize: 13, color: '#6b7280' }}>
                  <div>🎯 <strong>Level:</strong> {parsedJobData.seniority}</div>
                  <div>🔧 <strong>Skills:</strong> {parsedJobData.requiredSkills.length} detected</div>
                  {parsedJobData.yearsRequired && (
                    <div>⏱️ <strong>Experience:</strong> {parsedJobData.yearsRequired}+ years</div>
                  )}
                </div>
              )}
            </div>
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: 24,
              fontSize: 14,
              lineHeight: 1.6,
              color: '#374151'
            }}>
              <h4 style={{ marginTop: 0, color: '#111827' }}>{job.title}</h4>
              <p style={{ color: '#6b7280', marginBottom: 16 }}>{job.company_name}</p>
              <div style={{ whiteSpace: 'pre-wrap' }}>{htmlToPlainText(job.description)}</div>
            </div>
          </div>

          {/* Right Panel - Generated Resume */}
          <div style={{
            width: '60%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '16px 24px',
              background: '#f3f4f6',
              borderBottom: '1px solid #e5e7eb'
            }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Tailored Resume</h3>
            </div>
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: 24,
              background: '#ffffff'
            }}>
              {loading && (
                <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
                  <div>Analyzing job description and tailoring your resume...</div>
                  <div style={{ fontSize: 13, marginTop: 8 }}>This may take 10-15 seconds</div>
                </div>
              )}
              
              {!loading && !generatedResume && (
                <div style={{ textAlign: 'center', padding: 40, color: '#6b7280' }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>📄</div>
                  <div>Click "Generate Resume" to create a tailored version</div>
                  <div style={{ fontSize: 13, marginTop: 8 }}>
                    AI will optimize your resume with keywords from the job description
                  </div>
                </div>
              )}
              
              {!loading && generatedResume && (
                <div style={{
                  fontFamily: '"Charter", "Georgia", serif',
                  whiteSpace: 'pre-wrap',
                  fontSize: 14,
                  lineHeight: 1.8,
                  color: '#1f2937',
                  background: '#ffffff',
                  padding: '40px 60px',
                  border: '1px solid #e5e7eb',
                  maxWidth: 850,
                  margin: '0 auto'
                }}>
                  {renderFormattedText(markdownToPlainText(generatedResume))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Auto-Apply Flow Panel (slides up from bottom) */}
        {showApplyFlow && (
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            background: 'white',
            borderTop: '2px solid #667eea',
            maxHeight: '50%',
            overflow: 'auto',
            boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
            animation: 'slideUp 0.3s ease-out'
          }}>
            <div style={{ padding: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ margin: 0, fontSize: 18, color: '#667eea' }}>🤖 Auto-Apply Wizard</h3>
                <button
                  onClick={() => setShowApplyFlow(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: 24,
                    cursor: 'pointer',
                    color: '#6b7280'
                  }}
                >
                  ×
                </button>
              </div>

              {applyLoading && (
                <div style={{ textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
                  <div>{applyStatus}</div>
                </div>
              )}

              {!applyLoading && missingFields.length > 0 && (
                <div>
                  <div style={{
                    background: '#fef3c7',
                    border: '1px solid #fbbf24',
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 20,
                    fontSize: 14
                  }}>
                    <strong>⚠️ Additional Information Required</strong>
                    <p style={{ margin: '8px 0 0' }}>
                      The application form requires the following fields. Please provide them below:
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
                    {missingFields.map((field) => (
                      <div key={field.field}>
                        <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
                          {field.label}
                        </label>
                        <input
                          type={field.type}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                          value={userInputs[field.field] || ''}
                          onChange={(e) => setUserInputs({ ...userInputs, [field.field]: e.target.value })}
                          style={{
                            width: '100%',
                            padding: '10px 12px',
                            border: '1px solid #d1d5db',
                            borderRadius: 6,
                            fontSize: 14
                          }}
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={handleSubmitApplication}
                    disabled={applyLoading}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: applyLoading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {applyLoading ? 'Applying...' : 'Fill Application Form'}
                  </button>
                </div>
              )}

              {!applyLoading && missingFields.length === 0 && detectedFields && (
                <div>
                  <div style={{
                    background: '#d1fae5',
                    border: '1px solid #10b981',
                    borderRadius: 8,
                    padding: 16,
                    marginBottom: 20
                  }}>
                    <strong>✅ All information available!</strong>
                    <p style={{ margin: '8px 0 0', fontSize: 14 }}>
                      We have all the required information. Click below to auto-fill the application form.
                    </p>
                  </div>

                  <button
                    onClick={handleSubmitApplication}
                    style={{
                      width: '100%',
                      padding: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: 8,
                      fontSize: 16,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Start Auto-Fill
                  </button>
                </div>
              )}

              {applyStatus === 'failed' && (
                <div style={{
                  background: '#fee2e2',
                  border: '1px solid #ef4444',
                  borderRadius: 8,
                  padding: 16,
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>❌</div>
                  <strong>Application Failed</strong>
                  <p style={{ margin: '8px 0 0', fontSize: 14 }}>
                    Please try applying manually or contact support.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        
        .markdown-content h1 {
          font-size: 24px;
          font-weight: 700;
          margin-top: 24px;
          margin-bottom: 12px;
          color: #111827;
        }
        .markdown-content h2 {
          font-size: 20px;
          font-weight: 600;
          margin-top: 20px;
          margin-bottom: 10px;
          color: #1f2937;
          border-bottom: 2px solid #e5e7eb;
          padding-bottom: 6px;
        }
        .markdown-content h3 {
          font-size: 16px;
          font-weight: 600;
          margin-top: 16px;
          margin-bottom: 8px;
          color: #374151;
        }
        .markdown-content p {
          margin-bottom: 12px;
          line-height: 1.6;
          color: #374151;
        }
        .markdown-content ul, .markdown-content ol {
          margin-left: 24px;
          margin-bottom: 16px;
        }
        .markdown-content li {
          margin-bottom: 8px;
          line-height: 1.6;
        }
        .markdown-content strong {
          font-weight: 600;
          color: #111827;
        }
        .markdown-content code {
          background: #f3f4f6;
          padding: 2px 6px;
          border-radius: 3px;
          font-family: monospace;
          font-size: 13px;
        }
      `}</style>

      {/* Smart Apply Helper Modal */}
      {showSmartHelper && (
        <SmartApplyHelper
          job={job}
          userData={{
            name: JSON.parse(localStorage.getItem('hf_user') || '{}').name || '',
            email: JSON.parse(localStorage.getItem('hf_user') || '{}').email || '',
            phone: JSON.parse(localStorage.getItem('hf_user') || '{}').phone || '',
            linkedin: JSON.parse(localStorage.getItem('hf_user') || '{}').linkedin || '',
            github: JSON.parse(localStorage.getItem('hf_user') || '{}').github || ''
          }}
          generatedResume={generatedResume}
          onClose={() => setShowSmartHelper(false)}
          onDownloadPDF={handleDownloadPDF}
        />
      )}
    </div>
  );
}
