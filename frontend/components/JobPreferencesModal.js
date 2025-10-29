import { useState } from 'react';
import { getToken, uploadResume } from '../lib/api';

export default function JobPreferencesModal({ onClose, onSave }) {
  const [phone, setPhone] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [location, setLocation] = useState('');
  const [skills, setSkills] = useState('');
  const [preferredJobTypes, setPreferredJobTypes] = useState([]);
  const [preferredLocations, setPreferredLocations] = useState('');
  const [loading, setLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState(null);

  const jobTypeOptions = [
    { value: 'remote', label: 'Remote' },
    { value: 'onsite', label: 'On-site' },
    { value: 'hybrid', label: 'Hybrid' },
    { value: 'full-time', label: 'Full-time' },
    { value: 'part-time', label: 'Part-time' },
    { value: 'contract', label: 'Contract' }
  ];

  function toggleJobType(value) {
    if (preferredJobTypes.includes(value)) {
      setPreferredJobTypes(preferredJobTypes.filter(t => t !== value));
    } else {
      setPreferredJobTypes([...preferredJobTypes, value]);
    }
  }

  const showLocationField = preferredJobTypes.includes('onsite') || preferredJobTypes.includes('hybrid');

  async function handleResumeUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    setResumeFile(file);
    setUploadingResume(true);
    
    try {
      const token = getToken();
      const res = await uploadResume(token, file);
      
      if (res.extractedSkills) {
        setExtractedSkills(res.extractedSkills);
        setSkills(res.extractedSkills.join(', '));
        
        // Show success message
        alert('✅ Resume uploaded! Skills extracted automatically.');
      } else {
        alert('Resume uploaded successfully!');
      }
    } catch (err) {
      console.error('Failed to upload resume:', err);
      alert('Failed to upload resume. Please try again.');
    }
    
    setUploadingResume(false);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    
    const preferences = {
      phone,
      linkedin,
      github,
      location,
      skills,
      preferredJobTypes: preferredJobTypes.join(','),
      preferredLocations: showLocationField ? preferredLocations : ''
    };
    
    await onSave(preferences);
    setLoading(false);
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '20px'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          padding: '24px',
          borderRadius: '12px 12px 0 0'
        }}>
          <h2 style={{ margin: 0, fontSize: '24px' }}>📋 Set Your Job Preferences</h2>
          <p style={{ margin: '8px 0 0', opacity: 0.9, fontSize: '14px' }}>
            Help us find the perfect jobs for you
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
          <div style={{
            marginBottom: '20px',
            padding: '16px',
            background: '#f0f9ff',
            borderRadius: '8px',
            border: '2px dashed #0b5fff'
          }}>
            <label style={{ 
              display: 'block', 
              marginBottom: '8px',
              fontWeight: '600',
              color: '#0b5fff'
            }}>
              📄 Upload Resume (Optional but Recommended)
            </label>
            <input 
              type="file" 
              accept=".pdf,.doc,.docx"
              onChange={handleResumeUpload}
              disabled={uploadingResume}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                cursor: uploadingResume ? 'not-allowed' : 'pointer'
              }}
            />
            {uploadingResume && (
              <p style={{ marginTop: '8px', color: '#0b5fff', fontSize: '14px' }}>
                🔄 Uploading and extracting skills...
              </p>
            )}
            {extractedSkills && (
              <p style={{ marginTop: '8px', color: '#10b981', fontSize: '14px' }}>
                ✅ Extracted {extractedSkills.length} skills from your resume!
              </p>
            )}
            <p style={{ marginTop: '8px', fontSize: '13px', color: '#64748b' }}>
              We'll automatically extract your skills from your resume
            </p>
          </div>
          
          <label>Phone Number</label>
          <input 
            value={phone} 
            onChange={e=>setPhone(e.target.value)} 
            type="tel" 
            placeholder="+1 (555) 123-4567"
            style={{ marginBottom: '16px' }}
          />
          
          <label>LinkedIn Profile URL</label>
          <input 
            value={linkedin} 
            onChange={e=>setLinkedin(e.target.value)} 
            type="url" 
            placeholder="https://linkedin.com/in/yourprofile"
            style={{ marginBottom: '16px' }}
          />
          
          <label>GitHub Profile URL</label>
          <input 
            value={github} 
            onChange={e=>setGithub(e.target.value)} 
            type="url" 
            placeholder="https://github.com/yourusername"
            style={{ marginBottom: '16px' }}
          />
          
          <label>Current Location</label>
          <input 
            value={location} 
            onChange={e=>setLocation(e.target.value)} 
            placeholder="e.g., San Francisco, CA"
            style={{ marginBottom: '16px' }}
          />
          
          <label>Skills (comma separated) *</label>
          <input 
            value={skills} 
            onChange={e=>setSkills(e.target.value)} 
            placeholder="e.g., React, Node.js, Python"
            required
            style={{ marginBottom: '16px' }}
          />
          {extractedSkills && (
            <p style={{ marginTop: '-12px', marginBottom: '16px', fontSize: '13px', color: '#10b981' }}>
              💡 Skills auto-filled from your resume. Feel free to edit!
            </p>
          )}
          
          <label>Preferred Job Types *</label>
          <div style={{
            display: 'grid', 
            gridTemplateColumns: 'repeat(2, 1fr)', 
            gap: '8px', 
            marginBottom: '16px'
          }}>
            {jobTypeOptions.map(option => (
              <label 
                key={option.value} 
                style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  cursor: 'pointer', 
                  padding: '8px 12px', 
                  background: preferredJobTypes.includes(option.value) ? '#e0f2fe' : '#f3f4f6', 
                  borderRadius: '6px', 
                  border: preferredJobTypes.includes(option.value) ? '2px solid #0b5fff' : '1px solid #e5e7eb',
                  transition: 'all 0.2s'
                }}
              >
                <input 
                  type="checkbox" 
                  checked={preferredJobTypes.includes(option.value)}
                  onChange={() => toggleJobType(option.value)}
                  style={{ marginRight: '8px' }}
                />
                {option.label}
              </label>
            ))}
          </div>
          
          {showLocationField && (
            <>
              <label>Preferred Locations for On-site/Hybrid (comma separated)</label>
              <input 
                value={preferredLocations} 
                onChange={e=>setPreferredLocations(e.target.value)} 
                placeholder="e.g., New York, Los Angeles, Remote"
                style={{ marginBottom: '16px' }}
              />
            </>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button 
              type="submit" 
              disabled={loading || !skills || preferredJobTypes.length === 0}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: loading || !skills || preferredJobTypes.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                opacity: loading || !skills || preferredJobTypes.length === 0 ? 0.6 : 1
              }}
            >
              {loading ? 'Saving...' : 'Save & Find Jobs'}
            </button>
            <button 
              type="button" 
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '12px 24px',
                background: '#f3f4f6',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
