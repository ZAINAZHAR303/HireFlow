import { useState, useEffect } from 'react';
import { toast } from "../lib/toast";
import { getUser, uploadResume, updateProfile } from '../lib/api';
import { extractResumeText } from '../lib/extractResumeText';
import { parseResumeProfile } from '../lib/resumeParse';

export default function ResumeUploadModal({ onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [skills, setSkills] = useState('');
  const [preferredJobTypes, setPreferredJobTypes] = useState([]);
  const [preferredLocations, setPreferredLocations] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');

  const user = getUser();

  useEffect(() => {
    // Pre-fill with existing user data
    if (user) {
      setSkills(user.skills?.join(', ') || '');
      setPreferredJobTypes(user.preferredJobTypes || []);
      setPreferredLocations(user.preferredLocations?.join(', ') || '');
      setPhone(user.phone || '');
      setLocation(user.location || '');
    }
  }, []);

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

  async function handleUpload(e) {
    e.preventDefault();

    setUploading(true);

    try {
      let skillsArray = skills.split(',').map(s => s.trim()).filter(Boolean);
      const locationsArray = preferredLocations.split(',').map(s => s.trim()).filter(Boolean);
      let resumePhone = phone;

      // Upload the resume (if any), extracting its text in the browser first,
      // then auto-extract skills + contact info from it.
      if (file) {
        const text = await extractResumeText(file);
        const result = await uploadResume(null, file, text);
        if (result.error) {
          toast(result.error);
          setUploading(false);
          return;
        }
        const parsed = parseResumeProfile(text);
        if (parsed.skills.length) {
          // Merge résumé skills with whatever the user typed (de-duped).
          skillsArray = Array.from(new Set([...skillsArray, ...parsed.skills]));
          setSkills(skillsArray.join(', '));
        } else if (!result.textLength) {
          toast('⚠️ Couldn\'t read this PDF (it may be scanned/image-based). Enter your skills manually.');
        }
        if (!resumePhone && parsed.phone) resumePhone = parsed.phone;
      }

      const profileData = {
        skills: skillsArray,
        preferredJobTypes,
        preferredLocations: showLocationField ? locationsArray : [],
        phone: resumePhone,
        location
      };

      // Save preferences to Supabase.
      const data = await updateProfile(null, profileData);
      if (data.error) {
        toast(data.error);
        setUploading(false);
        return;
      }

      const updatedUser = { ...user, ...data.user };
      localStorage.setItem('hf_user', JSON.stringify(updatedUser));
      onUploaded({
        ...data.user,
        extractedSkills: skillsArray,
        preferredJobTypes,
        preferredLocations: locationsArray,
      });
    } catch (err) {
      console.error('Upload error:', err);
      toast('Update failed. Please try again.');
    }
    setUploading(false);
  }

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
      zIndex: 1000
    }}>
      <div className="card" style={{
        maxWidth: 600,
        width: '90%',
        background: 'white',
        position: 'relative',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            background: 'transparent',
            border: 'none',
            fontSize: 24,
            cursor: 'pointer',
            color: '#666'
          }}
        >×</button>
        
        <h2 style={{marginTop: 0}}>Update Your Profile</h2>
        <p className="muted">Update your resume or preferences. Leave fields unchanged to keep existing values.</p>

        <form onSubmit={handleUpload}>
          <label>Upload New Resume (optional)</label>
          <input 
            type="file" 
            accept=".pdf,.doc,.docx" 
            onChange={e=>setFile(e.target.files[0])}
            disabled={uploading}
          />
          <p className="muted" style={{fontSize: 13, marginTop: 4}}>Leave empty to keep your existing resume</p>
          
          <label>Skills (comma separated)</label>
          <input 
            value={skills} 
            onChange={e=>setSkills(e.target.value)}
            placeholder="React, Node.js, Python, Full Stack Development"
            disabled={uploading}
          />

          <label>Phone Number</label>
          <input 
            value={phone} 
            onChange={e=>setPhone(e.target.value)}
            type="tel"
            placeholder="+1 (555) 123-4567"
            disabled={uploading}
          />

          <label>Current Location</label>
          <input 
            value={location} 
            onChange={e=>setLocation(e.target.value)}
            placeholder="e.g., San Francisco, CA"
            disabled={uploading}
          />

          <label>Preferred Job Types</label>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 12}}>
            {jobTypeOptions.map(option => (
              <label key={option.value} style={{display: 'flex', alignItems: 'center', cursor: 'pointer', padding: '8px 12px', background: preferredJobTypes.includes(option.value) ? '#e0f2fe' : '#f3f4f6', borderRadius: 6, border: preferredJobTypes.includes(option.value) ? '2px solid #0b5fff' : '1px solid #e5e7eb'}}>
                <input 
                  type="checkbox" 
                  checked={preferredJobTypes.includes(option.value)}
                  onChange={() => toggleJobType(option.value)}
                  disabled={uploading}
                  style={{marginRight: 8}}
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
                disabled={uploading}
              />
            </>
          )}

          <div style={{marginTop: 20, display: 'flex', gap: 12, justifyContent: 'flex-end'}}>
            <button type="button" onClick={onClose} style={{background: '#999'}} disabled={uploading}>
              Cancel
            </button>
            <button type="submit" disabled={uploading}>
              {uploading ? 'Updating...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
