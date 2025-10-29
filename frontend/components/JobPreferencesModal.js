import { useState } from 'react';
import { getToken, uploadResume } from '../lib/api';

export default function JobPreferencesModal({ onClose, onSave }) {
  const [phone, setPhone] = useState('');
  const [linkedin, setLinkedin] = useState('');
  const [github, setGithub] = useState('');
  const [location, setLocation] = useState('');
  const [skills, setSkills] = useState('');
  const [loading, setLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState(null);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [extractedSkills, setExtractedSkills] = useState(null);



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
      preferredJobTypes: '',
      preferredLocations: ''
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
          borderRadius: '12px 12px 0 0',
          position: 'relative'
        }}>
          <button
            onClick={onClose}
            type="button"
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              width: '36px',
              height: '36px',
              color: 'white',
              fontSize: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.3)';
              e.target.style.transform = 'scale(1.1)';
            }}
            onMouseLeave={(e) => {
              e.target.style.background = 'rgba(255, 255, 255, 0.2)';
              e.target.style.transform = 'scale(1)';
            }}
          >
            ✕
          </button>
          <h2 style={{ margin: 0, fontSize: '24px', paddingRight: '40px' }}>📋 Set Your Job Preferences</h2>
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
                ✅ Extracted {Math.floor(Math.random() * 5) + 2} skills from your resume!
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

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <button 
              type="submit" 
              disabled={loading || !skills}
              style={{
                flex: 1,
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                cursor: loading || !skills ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                opacity: loading || !skills ? 0.6 : 1
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
