const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Application = require('../models/Application');

// POST /generate-interview-prep - Generate interview questions and company research
router.post('/generate-interview-prep', authMiddleware, async (req, res) => {
  try {
    const { applicationId, jobDescription, jobTitle, companyName } = req.body;

    if (!applicationId || !jobDescription || !jobTitle || !companyName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`🎯 Generating interview prep for ${jobTitle} at ${companyName}`);
    console.log(`📋 Job description length: ${jobDescription?.length} characters`);

    // Find application
    const application = await Application.findOne({
      _id: applicationId,
      userId: req.user._id
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Check if interview prep already exists - return cached version
    if (application.interviewPrep && application.interviewPrep.questions && application.interviewPrep.questions.length > 0) {
      console.log('✅ Returning cached interview prep');
      return res.json({
        success: true,
        interviewPrep: application.interviewPrep,
        cached: true
      });
    }
    
    // If interviewPrep exists but questions array is empty, regenerate
    if (application.interviewPrep && application.interviewPrep.questions && application.interviewPrep.questions.length === 0) {
      console.log('⚠️ Found empty interview prep, will regenerate');
    }

    const GEMINI_API_KEY = process.env.GEMINI_INTERVIEW_API_KEY || process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_INTERVIEW_API_KEY not configured');
    }

    console.log('🔑 Using interview API key:', GEMINI_API_KEY.substring(0, 10) + '...');

    // Generate interview questions with AI
    const questionsPrompt = `You are an expert career coach. Generate 10 common interview questions with detailed answers for this job role.

Job Title/Role: ${jobTitle}
Company: ${companyName}

Generate exactly 10 questions in these categories:
- 3 Behavioral questions (teamwork, leadership, problem-solving)
- 4 Technical/Role-specific questions (based on the job title)
- 3 General questions about the role and motivation

For each question, provide:
1. question: The interview question
2. answer: A detailed answer using the STAR method (Situation, Task, Action, Result) with specific examples
3. category: Either "behavioral", "technical", or "general"

IMPORTANT: Return ONLY a valid JSON array. No markdown, no code blocks, no extra text.
Format: [{"question":"...","answer":"...","category":"behavioral"},...]

Example for a Software Engineer role:
[
  {
    "question": "Tell me about a time you worked on a challenging project.",
    "answer": "Situation: I was working on a legacy system that needed modernization. Task: I had to migrate the codebase while maintaining uptime. Action: I created a phased migration plan, wrote comprehensive tests, and coordinated with the team. Result: Successfully migrated with zero downtime and 30% performance improvement.",
    "category": "behavioral"
  }
]`;

    const questionsResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: questionsPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 3000
          }
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      }
    );

    const questionsData = await questionsResponse.json();
    console.log('📦 Raw Gemini response for questions:', JSON.stringify(questionsData).substring(0, 500));
    
    let questions = [];
    try {
      const content = questionsData.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
      console.log('📝 Extracted content:', content.substring(0, 300));
      
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
      const jsonString = jsonMatch[1].trim();
      console.log('🔧 Parsing JSON:', jsonString.substring(0, 200));
      
      questions = JSON.parse(jsonString);
      console.log(`✅ Parsed ${questions.length} questions`);
    } catch (err) {
      console.error('❌ Failed to parse questions:', err);
      console.error('Raw content that failed:', questionsData.candidates?.[0]?.content?.parts?.[0]?.text);
      questions = [];
    }

    // Generate company research with AI
    const researchPrompt = `You are a career research analyst. Provide brief research about this company and role for interview preparation.

Company: ${companyName}
Job Title: ${jobTitle}

Provide the following (keep it concise):
1. summary: A 2-3 sentence overview of what this company typically does (based on the company name)
2. keyFacts: Array of 5 brief facts about working in this type of role or company
3. culture: 1-2 sentences about typical culture for this type of company
4. recentNews: 1-2 sentences about industry trends for this role

IMPORTANT: Return ONLY a valid JSON object. No markdown, no code blocks, no extra text.
Format: {"summary":"...","keyFacts":["...","..."],"culture":"...","recentNews":"..."}

Example:
{"summary":"A technology company focused on innovation.","keyFacts":["Fast-paced environment","Collaborative teams","Growth opportunities","Modern tech stack","Remote-friendly"],"culture":"Emphasis on innovation and teamwork with flexible work arrangements.","recentNews":"The tech industry is seeing increased demand for cloud and AI skills."}`;

    const researchResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: researchPrompt }] }],
          generationConfig: {
            temperature: 0.6,
            maxOutputTokens: 1500
          }
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      }
    );

    const researchData = await researchResponse.json();
    let companyResearch = {
      summary: '',
      keyFacts: [],
      culture: '',
      recentNews: ''
    };
    
    try {
      const content = researchData.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || [null, content];
      companyResearch = JSON.parse(jsonMatch[1]);
    } catch (err) {
      console.error('Failed to parse company research:', err);
    }

    // Update application with interview prep data
    application.interviewPrep = {
      questions,
      companyResearch,
      preparedAt: new Date()
    };
    await application.save();

    console.log(`✅ Generated ${questions.length} questions and company research`);
    
    if (questions.length === 0) {
      console.error('⚠️ WARNING: Saved interview prep with 0 questions!');
    }

    res.json({
      success: true,
      interviewPrep: {
        questions,
        companyResearch
      }
    });

  } catch (err) {
    console.error('Interview prep generation error:', err);
    
    // Fallback: Use sample questions if API fails
    if (err.code === 'UND_ERR_CONNECT_TIMEOUT' || err.message?.includes('timeout') || err.message?.includes('fetch failed')) {
      console.log('⚠️ API timeout - using fallback sample questions');
      
      const sampleQuestions = [
        {
          question: `Tell me about your experience with ${jobTitle} responsibilities.`,
          answer: `Situation: In my previous role, I worked extensively on similar ${jobTitle} tasks. Task: I was responsible for leading projects and delivering results. Action: I collaborated with cross-functional teams, implemented best practices, and ensured quality deliverables. Result: Successfully completed multiple projects with positive feedback and measurable improvements.`,
          category: 'behavioral'
        },
        {
          question: 'Describe a challenging project you worked on and how you overcame obstacles.',
          answer: 'Situation: I faced a complex project with tight deadlines. Task: I needed to deliver high-quality work while managing multiple stakeholders. Action: I broke down the project into manageable tasks, prioritized effectively, and communicated regularly with the team. Result: Delivered the project on time with 95% stakeholder satisfaction.',
          category: 'behavioral'
        },
        {
          question: 'How do you stay updated with the latest trends and technologies in your field?',
          answer: 'I regularly read industry blogs, attend webinars, participate in online communities, and work on side projects to experiment with new technologies. I also take online courses and certifications to deepen my knowledge.',
          category: 'general'
        },
        {
          question: `What technical skills are most important for a ${jobTitle}?`,
          answer: `For a ${jobTitle} role, the key technical skills include strong problem-solving abilities, proficiency in relevant tools and technologies, understanding of best practices, and the ability to work in agile environments. Communication and collaboration skills are equally important.`,
          category: 'technical'
        },
        {
          question: 'Tell me about a time you had to learn a new technology quickly.',
          answer: 'Situation: My team needed to adopt a new framework for an urgent project. Task: I had one week to become proficient. Action: I dedicated time each day to tutorials, built a small project, and collaborated with colleagues who had experience. Result: Successfully contributed to the project and became a resource for other team members.',
          category: 'technical'
        },
        {
          question: 'How do you handle disagreements with team members?',
          answer: 'I believe in open communication and finding common ground. I listen actively to understand their perspective, share my viewpoint respectfully, and focus on the shared goal. If needed, I suggest involving a neutral party or using data to make an objective decision.',
          category: 'behavioral'
        },
        {
          question: `Why are you interested in the ${jobTitle} position at ${companyName}?`,
          answer: `I'm excited about this ${jobTitle} role at ${companyName} because it aligns with my career goals and allows me to leverage my experience while learning new skills. I admire the company's mission and would love to contribute to its success.`,
          category: 'general'
        },
        {
          question: 'Describe your approach to problem-solving.',
          answer: 'I follow a structured approach: First, I clearly define the problem. Then, I gather relevant information and analyze root causes. Next, I brainstorm potential solutions and evaluate them based on feasibility and impact. Finally, I implement the best solution and monitor results to ensure effectiveness.',
          category: 'technical'
        },
        {
          question: 'Tell me about a time you had to meet a tight deadline.',
          answer: 'Situation: We had a product launch with a non-negotiable deadline. Task: I needed to complete my deliverables while maintaining quality. Action: I created a detailed timeline, eliminated distractions, worked extra hours when needed, and kept stakeholders informed. Result: Met the deadline and the launch was successful.',
          category: 'behavioral'
        },
        {
          question: 'What are your long-term career goals?',
          answer: `I aim to grow as a ${jobTitle} and eventually take on leadership responsibilities. I want to continue developing my technical expertise while also mentoring junior team members and contributing to strategic decisions that drive business impact.`,
          category: 'general'
        }
      ];
      
      const sampleResearch = {
        summary: `${companyName} is a company in the ${jobTitle.includes('Dev') || jobTitle.includes('Engineer') || jobTitle.includes('Software') ? 'technology' : 'business'} sector, focused on innovation and growth.`,
        keyFacts: [
          'Dynamic work environment',
          'Opportunities for professional development',
          'Collaborative team culture',
          'Focus on innovation and quality',
          'Competitive benefits and compensation'
        ],
        culture: 'The company values collaboration, innovation, and continuous learning, with a focus on work-life balance.',
        recentNews: `The industry is experiencing growth in areas related to ${jobTitle} roles, with increasing demand for skilled professionals.`
      };
      
      // Save fallback data
      application.interviewPrep = {
        questions: sampleQuestions,
        companyResearch: sampleResearch,
        preparedAt: new Date()
      };
      await application.save();
      
      return res.json({
        success: true,
        interviewPrep: {
          questions: sampleQuestions,
          companyResearch: sampleResearch
        },
        fallback: true,
        message: 'Using sample questions due to network connectivity issues. Please check your internet connection for AI-generated questions.'
      });
    }
    
    // Provide specific error messages
    let errorMessage = 'Failed to generate interview preparation';
    if (err.code === 'UND_ERR_CONNECT_TIMEOUT' || err.message?.includes('timeout')) {
      errorMessage = 'Connection timeout. Please check your internet connection and try again.';
    } else if (err.message?.includes('fetch failed')) {
      errorMessage = 'Network error. Please check your internet connection or firewall settings.';
    } else if (err.message?.includes('API key')) {
      errorMessage = 'API key error. Please check your Gemini API key configuration.';
    }
    
    res.status(500).json({ 
      error: errorMessage,
      message: err.message 
    });
  }
});

// POST /generate-cover-letter - Generate cover letter for job
router.post('/generate-cover-letter', authMiddleware, async (req, res) => {
  try {
    const { applicationId, jobDescription, jobTitle, companyName, userSkills, userName } = req.body;

    if (!applicationId || !jobDescription || !jobTitle || !companyName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    console.log(`📝 Generating cover letter for ${jobTitle} at ${companyName}`);

    // Find application
    const application = await Application.findOne({
      _id: applicationId,
      userId: req.user._id
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    // Check if cover letter already exists - return cached version
    if (application.coverLetter && application.coverLetter.length > 0) {
      console.log('✅ Returning cached cover letter');
      return res.json({
        success: true,
        coverLetter: application.coverLetter,
        cached: true
      });
    }

    const GEMINI_API_KEY = process.env.GEMINI_INTERVIEW_API_KEY || process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_INTERVIEW_API_KEY not configured');
    }

    // Generate cover letter with AI
    const coverLetterPrompt = `You are a professional career coach. Write a compelling, personalized cover letter for this job application.

Job Title: ${jobTitle}
Company: ${companyName}
Applicant Name: ${userName || 'Candidate'}
Skills: ${userSkills?.join(', ') || 'N/A'}

Job Description:
${jobDescription}

Write a professional cover letter that:
1. Shows enthusiasm for the role and company
2. Highlights relevant skills and experience
3. Demonstrates understanding of the job requirements
4. Is concise (3-4 paragraphs)
5. Uses a professional but personable tone

Format: Plain text, ready to copy-paste. Do not include placeholders like [Your Name] - use the actual name provided.`;

    const coverLetterResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-lite:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: coverLetterPrompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1500
          }
        })
      }
    );

    const coverLetterData = await coverLetterResponse.json();
    const coverLetter = coverLetterData.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Update application with cover letter
    application.coverLetter = coverLetter;
    await application.save();

    console.log(`✅ Generated cover letter (${coverLetter.length} chars)`);

    res.json({
      success: true,
      coverLetter
    });

  } catch (err) {
    console.error('Cover letter generation error:', err);
    res.status(500).json({ 
      error: 'Failed to generate cover letter',
      message: err.message 
    });
  }
});

module.exports = router;
