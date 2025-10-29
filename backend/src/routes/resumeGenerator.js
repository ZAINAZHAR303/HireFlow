const express = require('express');
const authMiddleware = require('../middleware/authMiddleware');
const Resume = require('../models/resume');
const { generateResumePDF } = require('../utils/pdfGenerator');
const router = express.Router();

// Job Description Parser - Extract key information from JD
function parseJobDescription(jobDescription) {
  const jdLower = jobDescription.toLowerCase();
  
  // Extract required skills (common tech keywords)
  const skillKeywords = [
    'javascript', 'typescript', 'python', 'java', 'react', 'angular', 'vue',
    'node', 'express', 'django', 'flask', 'spring', 'mongodb', 'postgresql',
    'mysql', 'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'git', 'agile',
    'scrum', 'api', 'rest', 'graphql', 'ci/cd', 'jenkins', 'terraform',
    'html', 'css', 'sass', 'webpack', 'redux', 'next.js', 'tailwind'
  ];
  
  const foundSkills = skillKeywords.filter(skill => jdLower.includes(skill));
  
  // Detect seniority level
  let seniority = 'Mid-level';
  if (jdLower.includes('senior') || jdLower.includes('lead') || jdLower.includes('principal')) {
    seniority = 'Senior';
  } else if (jdLower.includes('junior') || jdLower.includes('entry') || jdLower.includes('graduate')) {
    seniority = 'Junior';
  }
  
  // Extract years of experience
  const yearsMatch = jobDescription.match(/(\d+)\+?\s*years?/i);
  const yearsRequired = yearsMatch ? parseInt(yearsMatch[1]) : null;
  
  return {
    requiredSkills: foundSkills,
    seniority,
    yearsRequired,
    keywords: foundSkills
  };
}

// Generate tailored resume using Gemini API with retry logic
async function generateTailoredResume(oldResume, jobData, parsedJD, tone = 'professional') {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  // const GROQ_API_KEY = process.env.GROQ_API_KEY;
  
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  const prompt = `You are an expert resume writer and ATS optimization specialist. Your task is to tailor a resume to match a specific job description while maintaining truthfulness.

**Job Title:** ${jobData.title}
**Company:** ${jobData.company}
**Seniority Level:** ${parsedJD.seniority}
**Required Skills:** ${parsedJD.requiredSkills.join(', ')}

**Job Description:**
${jobData.description.substring(0, 2000)}

**Current Resume:**
${oldResume.substring(0, 2000)}

**Tone:** ${tone}

Generate a tailored resume with these sections:
1. **Professional Summary** (2-3 sentences highlighting relevant experience for THIS job)
2. **Key Skills** (list 8-12 skills from the job description that match the resume)
3. **Experience Bullets** (5-7 achievement-focused bullet points that:
   - Use keywords from the job description
   - Quantify achievements with metrics
   - Start with strong action verbs
   - Highlight relevant experience for this role)

**ATS Optimization Rules:**
- Use exact keywords from job description
- Include both acronyms and full terms (e.g., "CI/CD (Continuous Integration/Continuous Deployment)")
- Quantify achievements with numbers and percentages
- Use industry-standard job titles
- Avoid tables, graphics, headers/footers
- Use standard section headings

Format the output in clean Markdown with clear sections.`;

  try {
    console.log(`🤖 Generating resume with Gemini...`);
    
    // Retry logic for 503 errors (model overloaded)
    let lastError;
    const maxRetries = 3;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`🔄 Retry attempt ${attempt}/${maxRetries}...`);
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, attempt * 2000));
        }
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: prompt
              }]
            }],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 8000,
              topP: 0.95,
              topK: 40
            }
          })
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          
          // If 503 (overloaded), retry
          if (response.status === 503) {
            console.log('⚠️ Model overloaded, will retry...');
            lastError = new Error('Gemini model is temporarily overloaded. Retrying...');
            continue;
          }
          
          console.error('Gemini API error response:', errorData);
          throw new Error(`Gemini API error (${response.status}): ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();
        
        // Check if response has the expected structure
        if (!data.candidates || !data.candidates[0]) {
          console.error('No candidates in response:', data);
          throw new Error('No candidates returned from Gemini API');
        }
        
        const candidate = data.candidates[0];
        
        // Check for parts in content
        if (!candidate.content || !candidate.content.parts || !candidate.content.parts[0]) {
          console.error('No content.parts in candidate:', candidate);
          
          // Check if it hit max tokens
          if (candidate.finishReason === 'MAX_TOKENS') {
            throw new Error('Response exceeded token limit. Try with a shorter resume or job description.');
          }
          
          throw new Error('Invalid response structure from Gemini API');
        }
        
        console.log('✅ Resume generated successfully');
        return candidate.content.parts[0].text;
        
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        lastError = error;
      }
    }
    
    throw lastError || new Error('Failed after all retry attempts');
    
  } catch (error) {
    console.error('Gemini API error:', error);
    throw error;
  }
}

// POST /generate-resume - Generate tailored resume
router.post('/generate-resume', authMiddleware, async (req, res) => {
  try {
    const { jobId, jobTitle, jobCompany, jobDescription, tone } = req.body;
    const user = req.user;

    if (!jobDescription) {
      return res.status(400).json({ error: 'Job description is required' });
    }

    // Get user's latest resume
    const resume = await Resume.findOne({ userId: user._id }).sort({ uploadedAt: -1 });
    
    if (!resume) {
      return res.status(404).json({ error: 'No resume found. Please upload your resume first.' });
    }

    console.log(`📝 Generating tailored resume for: ${jobTitle} at ${jobCompany}`);
    
    // Parse job description
    const parsedJD = parseJobDescription(jobDescription);
    console.log(`🔍 Parsed JD: ${parsedJD.requiredSkills.length} skills, ${parsedJD.seniority} level`);

    // Generate tailored resume
    const tailoredContent = await generateTailoredResume(
      resume.text,
      { title: jobTitle, company: jobCompany, description: jobDescription },
      parsedJD,
      tone || 'professional'
    );

    console.log('✅ Resume generated successfully');

    res.json({
      success: true,
      resume: {
        content: tailoredContent,
        format: 'markdown',
        parsedJobData: {
          requiredSkills: parsedJD.requiredSkills,
          seniority: parsedJD.seniority,
          yearsRequired: parsedJD.yearsRequired,
          keywords: parsedJD.keywords
        }
      }
    });
  } catch (err) {
    console.error('Resume generation error:', err);
    res.status(500).json({ 
      error: 'Failed to generate resume',
      message: err.message 
    });
  }
});

// POST /download-resume-pdf - Download tailored resume as PDF
router.post('/download-resume-pdf', authMiddleware, async (req, res) => {
  try {
    const { resumeContent, candidateName } = req.body;

    if (!resumeContent) {
      return res.status(400).json({ error: 'Resume content is required' });
    }

    console.log('📄 Generating PDF...');
    
    // Generate PDF
    const pdfBuffer = await generateResumePDF(resumeContent, candidateName);

    console.log('✅ PDF generated successfully');

    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${candidateName || 'Resume'}_Tailored.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF generation error:', err);
    res.status(500).json({ 
      error: 'Failed to generate PDF',
      message: err.message 
    });
  }
});

module.exports = router;
