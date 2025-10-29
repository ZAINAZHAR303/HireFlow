import { useState } from 'react';
import axios from 'axios';

export default function ApplyModal({ job, onClose }) {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [steps, setSteps] = useState([]);
  const [currentStep, setCurrentStep] = useState('');
  const [error, setError] = useState(null);

  const handleApply = async () => {
    try {
      setLoading(true);
      setStatus('starting');
      setCurrentStep('Initializing browser...');

      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4001'}/applications/apply`,
        {
          jobId: job.id,
          jobTitle: job.title,
          companyName: job.company_name,
          applyUrl: job.url,
          autoSubmit: false // Safety: don't auto-submit by default
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSteps(response.data.steps || []);
      setStatus(response.data.status);
      setCurrentStep('Application automation completed!');
      
    } catch (err) {
      console.error('Apply error:', err);
      setError(err.response?.data?.message || err.message);
      setStatus('failed');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success': return '#10b981';
      case 'filled_not_submitted': return '#f59e0b';
      case 'failed': return '#ef4444';
      default: return '#3b82f6';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'success': return '✅';
      case 'filled_not_submitted': return '⚠️';
      case 'failed': return '❌';
      default: return '🤖';
    }
  };

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
      zIndex: 9999,
      padding: 20
    }}>
      <div style={{
        background: 'white',
        borderRadius: 12,
        maxWidth: 600,
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 24px 20px',
          borderBottom: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, marginBottom: 4 }}>🤖 Auto-Apply</h2>
              <p style={{ margin: 0, fontSize: 14, opacity: 0.9 }}>
                {job.title} at {job.company_name}
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                width: 32,
                height: 32,
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{ padding: 24 }}>
          {!loading && !status && (
            <div>
              <div style={{
                background: '#fef3c7',
                border: '1px solid #fbbf24',
                borderRadius: 8,
                padding: 16,
                marginBottom: 20,
                fontSize: 14
              }}>
                <strong>⚠️ Safety Mode Enabled</strong>
                <p style={{ margin: '8px 0 0', lineHeight: 1.5 }}>
                  The system will fill out the form but <strong>will not submit</strong> automatically. 
                  You'll review the filled form before submitting manually.
                </p>
              </div>

              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 16, marginBottom: 12 }}>What will happen:</h3>
                <ul style={{ marginLeft: 20, lineHeight: 1.8, color: '#4b5563' }}>
                  <li>Browser will open and navigate to the application page</li>
                  <li>Form fields will be automatically detected</li>
                  <li>Your information will be filled in</li>
                  <li>Resume will be uploaded (if supported)</li>
                  <li>Form will be ready for your review and manual submission</li>
                </ul>
              </div>

              <button
                onClick={handleApply}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'transform 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.transform = 'translateY(-2px)'}
                onMouseLeave={(e) => e.target.style.transform = 'translateY(0)'}
              >
                Start Auto-Fill
              </button>
            </div>
          )}

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 20px' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
                Automating Application...
              </div>
              <div style={{ fontSize: 14, color: '#6b7280', marginBottom: 20 }}>
                {currentStep}
              </div>
              <div style={{
                height: 4,
                background: '#e5e7eb',
                borderRadius: 2,
                overflow: 'hidden'
              }}>
                <div style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, #667eea, #764ba2)',
                  width: '100%',
                  animation: 'loading 1.5s ease-in-out infinite'
                }} />
              </div>
            </div>
          )}

          {status && !loading && (
            <div>
              <div style={{
                textAlign: 'center',
                padding: '30px 20px',
                background: '#f9fafb',
                borderRadius: 8,
                marginBottom: 20
              }}>
                <div style={{ fontSize: 64, marginBottom: 12 }}>{getStatusIcon()}</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: getStatusColor(), marginBottom: 8 }}>
                  {status === 'success' && 'Application Submitted!'}
                  {status === 'filled_not_submitted' && 'Form Filled Successfully!'}
                  {status === 'failed' && 'Automation Failed'}
                </div>
                <div style={{ fontSize: 14, color: '#6b7280' }}>
                  {status === 'filled_not_submitted' && 'Please review and submit the form manually'}
                  {status === 'failed' && error}
                </div>
              </div>

              {steps.length > 0 && (
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Automation Steps:</h3>
                  <div style={{ maxHeight: 200, overflow: 'auto' }}>
                    {steps.map((step, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: index % 2 === 0 ? '#f9fafb' : 'white',
                        fontSize: 13,
                        borderRadius: 4,
                        marginBottom: 4
                      }}>
                        <span style={{ marginRight: 8 }}>
                          {step.status === 'success' ? '✅' : step.status === 'failed' ? '❌' : '⏳'}
                        </span>
                        <span>{step.step.replace(/_/g, ' ')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: '#f3f4f6',
                  color: '#374151',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: 16
                }}
              >
                Close
              </button>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
