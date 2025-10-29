import { useState } from 'react';

export default function SmartApplyHelper({ job, userData, generatedResume, onClose, onDownloadPDF }) {
  const [copiedField, setCopiedField] = useState(null);
  const [downloading, setDownloading] = useState(false);

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleDownloadPDF = async () => {
    setDownloading(true);
    try {
      await onDownloadPDF();
    } catch (err) {
      console.error('PDF download error:', err);
    } finally {
      setDownloading(false);
    }
  };

  // Only show fields that have values
  const allFields = [
    { label: 'Full Name', value: userData.name, icon: '👤' },
    { label: 'Email', value: userData.email, icon: '📧' },
    { label: 'Phone', value: userData.phone, icon: '📱' },
    { label: 'LinkedIn', value: userData.linkedin, icon: '💼' },
    { label: 'GitHub', value: userData.github, icon: '🔗' },
  ];
  
  const fields = allFields.filter(field => field.value);

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
          padding: 24,
          borderBottom: '1px solid #e5e7eb',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, marginBottom: 4 }}>📋 Smart Apply Helper</h2>
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
                fontSize: 18
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div style={{ padding: 24 }}>
          <div style={{
            background: '#dbeafe',
            border: '1px solid #3b82f6',
            borderRadius: 8,
            padding: 16,
            marginBottom: 20
          }}>
            <strong>💡 How to use:</strong>
            <ol style={{ margin: '8px 0 0', paddingLeft: 20, fontSize: 14, lineHeight: 1.8 }}>
              <li>Open the job application page in a new tab</li>
              <li>Click any field below to copy it to clipboard</li>
              <li>Paste (Ctrl+V) into the corresponding field on the application form</li>
              <li>Review and submit manually</li>
            </ol>
          </div>

          {/* Quick Copy Fields */}
          <h3 style={{ fontSize: 16, marginBottom: 12 }}>Your Information:</h3>
          <div style={{ display: 'grid', gap: 12, marginBottom: 24 }}>
            {fields.map((field) => (
              <div
                key={field.label}
                onClick={() => copyToClipboard(field.value, field.label)}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 14,
                  background: copiedField === field.label ? '#d1fae5' : '#f9fafb',
                  border: `2px solid ${copiedField === field.label ? '#10b981' : '#e5e7eb'}`,
                  borderRadius: 8,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{field.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 2 }}>{field.label}</div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: '#1f2937' }}>
                      {field.value}
                    </div>
                  </div>
                </div>
                {copiedField === field.label ? (
                  <span style={{ color: '#10b981', fontSize: 14, fontWeight: 600 }}>✓ Copied!</span>
                ) : (
                  <span style={{ color: '#6b7280', fontSize: 12 }}>Click to copy</span>
                )}
              </div>
            ))}
          </div>

          {/* Application Link */}
          <div style={{
            background: '#fef3c7',
            border: '1px solid #fbbf24',
            borderRadius: 8,
            padding: 16,
            marginBottom: 16
          }}>
            <strong>🔗 Application Page:</strong>
            <a
              href={job.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block',
                marginTop: 8,
                color: '#3b82f6',
                textDecoration: 'none',
                fontSize: 14,
                wordBreak: 'break-all'
              }}
            >
              {job.url}
            </a>
            <button
              onClick={() => window.open(job.url, '_blank')}
              style={{
                marginTop: 12,
                padding: '8px 16px',
                background: '#fbbf24',
                color: '#78350f',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
                width: '100%'
              }}
            >
              Open Application Page →
            </button>
          </div>

          {/* Resume Download */}
          {generatedResume && onDownloadPDF && (
            <div>
              <h3 style={{ fontSize: 16, marginBottom: 12 }}>Tailored Resume:</h3>
              <button
                onClick={handleDownloadPDF}
                disabled={downloading}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: downloading ? '#9ca3af' : '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: downloading ? 'not-allowed' : 'pointer',
                  marginBottom: 12
                }}
              >
                {downloading ? 'Downloading...' : '📄 Download Resume PDF'}
              </button>
              <p style={{ fontSize: 12, color: '#6b7280', margin: 0, textAlign: 'center' }}>
                Upload this PDF to the application form
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
