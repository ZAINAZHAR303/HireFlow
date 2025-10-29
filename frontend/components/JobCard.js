import { useState } from 'react';
import ResumeGeneratorModal from './ResumeGeneratorModal';

export default function JobCard({ job }){
  const [showResumeGenerator, setShowResumeGenerator] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const hasMatchScore = job.matchScore !== undefined;
  
  return (
    <>
      <div 
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '24px',
          marginBottom: '20px',
          boxShadow: isHovered 
            ? '0 12px 40px rgba(102, 126, 234, 0.15)' 
            : '0 4px 20px rgba(0, 0, 0, 0.08)',
          borderLeft: hasMatchScore ? `4px solid ${getScoreColor(job.matchScore)}` : '4px solid #e2e8f0',
          transition: 'all 0.3s ease',
          transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Gradient overlay on hover */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          opacity: isHovered ? 1 : 0,
          transition: 'opacity 0.3s ease'
        }} />

        <div style={{display:'flex', justifyContent:'space-between', gap: '20px'}}>
          <div style={{flex: 1}}>
            <div style={{display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, flexWrap: 'wrap'}}>
              <h3 style={{
                margin: 0,
                fontSize: '20px',
                fontWeight: 'bold',
                color: '#1e293b',
                transition: 'color 0.2s'
              }}>
                {job.title}
              </h3>
              {hasMatchScore && (
                <span style={{
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: 'bold',
                  background: getScoreColor(job.matchScore, 0.15),
                  color: getScoreColor(job.matchScore),
                  border: `1.5px solid ${getScoreColor(job.matchScore)}`,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  transition: 'all 0.2s'
                }}>
                  <span style={{fontSize: '16px'}}>{getScoreEmoji(job.matchScore)}</span>
                  {job.matchScore}% Match
                </span>
              )}
            </div>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              color: '#64748b',
              fontSize: '14px',
              marginBottom: '12px',
              flexWrap: 'wrap'
            }}>
              <span style={{fontWeight: '600', color: '#475569'}}>🏢 {job.company_name}</span>
              <span style={{color: '#cbd5e1'}}>•</span>
              <span>📁 {job.category}</span>
              <span style={{color: '#cbd5e1'}}>•</span>
              <span>💼 {job.job_type || 'Full-time'}</span>
              <span style={{color: '#cbd5e1'}}>•</span>
              <span>📅 {new Date(job.publication_date).toLocaleDateString()}</span>
            </div>
            
            {job.matchReasons && job.matchReasons.length > 0 && (
              <div style={{
                marginTop: 12,
                padding: '14px 16px',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                borderRadius: '12px',
                fontSize: '13px',
                border: '1px solid #86efac',
                transition: 'all 0.3s ease',
                transform: isHovered ? 'scale(1.02)' : 'scale(1)'
              }}>
                <strong style={{color: '#059669', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px'}}>
                  ✨ Why this is a great match:
                </strong>
                <ul style={{margin: '8px 0 0 0', paddingLeft: 24, lineHeight: '1.6'}}>
                  {job.matchReasons.slice(0, 3).map((reason, idx) => (
                    <li key={idx} style={{
                      color: '#065f46',
                      marginBottom: idx < job.matchReasons.slice(0, 3).length - 1 ? '4px' : 0
                    }}>
                      {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div style={{
              marginTop: 14,
              color: '#64748b',
              fontSize: '14px',
              lineHeight: '1.6',
              maxHeight: isExpanded ? 'none' : '60px',
              overflow: 'hidden',
              position: 'relative'
            }}>
              <div dangerouslySetInnerHTML={{
                __html: job.description ? (isExpanded ? job.description : job.description.slice(0, 200) + '...') : ''
              }} />
            </div>
            
            {job.description && job.description.length > 200 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}
                style={{
                  marginTop: '8px',
                  background: 'transparent',
                  color: '#667eea',
                  border: 'none',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f0f4ff';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                }}
              >
                {isExpanded ? '▲ Show Less' : '▼ Show More'}
              </button>
            )}
          </div>
          
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minWidth: '160px'
          }}>
            <button
              onClick={() => setShowResumeGenerator(true)}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                padding: '12px 20px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
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
              ✨ Tailor Resume
            </button>
            <a href={job.url} target="_blank" rel="noreferrer" style={{textDecoration: 'none'}}>
              <button style={{
                width: '100%',
                background: 'white',
                color: '#667eea',
                border: '2px solid #667eea',
                padding: '12px 20px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#667eea';
                e.target.style.color = 'white';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'white';
                e.target.style.color = '#667eea';
                e.target.style.transform = 'translateY(0)';
              }}
              >
                🔗 View Job
              </button>
            </a>
          </div>
        </div>
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

function getScoreEmoji(score) {
  if (score >= 80) return '🎯';
  if (score >= 60) return '✅';
  return '⚠️';
}
