import { useState } from 'react';
import ResumeGeneratorModal from './ResumeGeneratorModal';

export default function JobCard({ job }){
  const [showResumeGenerator, setShowResumeGenerator] = useState(false);
  const hasMatchScore = job.matchScore !== undefined;
  
  return (
    <>
      <div className="card" style={{borderLeft: hasMatchScore ? `4px solid ${getScoreColor(job.matchScore)}` : 'none'}}>
        <div style={{display:'flex', justifyContent:'space-between'}}>
          <div style={{flex: 1}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
              <h3 style={{margin:'0 0 6px 0'}}>{job.title}</h3>
              {hasMatchScore && (
                <span style={{
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 'bold',
                  background: getScoreColor(job.matchScore, 0.2),
                  color: getScoreColor(job.matchScore)
                }}>
                  {job.matchScore}% Match
                </span>
              )}
            </div>
            <div className="muted">{job.company_name} • {job.category} • {job.job_type || 'n/a'}</div>
            
            {job.matchReasons && job.matchReasons.length > 0 && (
              <div style={{marginTop: 8, padding: 8, background: '#f0fdf4', borderRadius: 4, fontSize: 13}}>
                <strong style={{color: '#059669'}}>✓ Why this matches:</strong>
                <ul style={{margin: '4px 0', paddingLeft: 20}}>
                  {job.matchReasons.slice(0, 3).map((reason, idx) => (
                    <li key={idx} style={{color: '#065f46'}}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <div style={{textAlign:'right'}}>
            <div className="muted">{new Date(job.publication_date).toLocaleDateString()}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button
                onClick={() => setShowResumeGenerator(true)}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500
                }}
              >
                ✨ Tailor Resume
              </button>
              <a href={job.url} target="_blank" rel="noreferrer">
                <button>View Job</button>
              </a>
            </div>
          </div>
        </div>
        <div style={{marginTop:8}} dangerouslySetInnerHTML={{__html: job.description ? job.description.slice(0,300) + '...' : ''}} />
      </div>

      {showResumeGenerator && (
        <ResumeGeneratorModal
          job={job}
          onClose={() => setShowResumeGenerator(false)}
        />
      )}
    </>
  );
}

function getScoreColor(score, alpha = 1) {
  if (score >= 80) return alpha === 1 ? '#059669' : `rgba(5, 150, 105, ${alpha})`;
  if (score >= 60) return alpha === 1 ? '#d97706' : `rgba(217, 119, 6, ${alpha})`;
  return alpha === 1 ? '#dc2626' : `rgba(220, 38, 38, ${alpha})`;
}
