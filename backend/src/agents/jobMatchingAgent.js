const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const { PromptTemplate } = require('@langchain/core/prompts');

/**
 * LangChain-based Job Matching Agent
 * Uses agentic reasoning to analyze resumes and match with jobs
 */
class JobMatchingAgent {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️ GEMINI_API_KEY not set, agent will be disabled');
      this.enabled = false;
      return;
    }
    
    this.enabled = true;
    this.model = new ChatGoogleGenerativeAI({
      apiKey: process.env.GEMINI_API_KEY,
      model: 'gemini-pro',
      temperature: 0.7,
    });
  }

  /**
   * Extract JSON from LangChain response
   */
  extractJSON(text) {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error('JSON parse error:', e.message);
        return null;
      }
    }
    return null;
  }

  /**
   * Agent task: Analyze resume and extract skills with reasoning
   */
  async analyzeResume(resumeText) {
    if (!this.enabled) {
      return {
        technicalSkills: [],
        softSkills: [],
        jobCategories: [],
        experienceLevel: 'mid',
        reasoning: 'Agent disabled - GEMINI_API_KEY not set',
      };
    }

    const prompt = PromptTemplate.fromTemplate(`
You are an expert career advisor and resume analyst. Analyze the following resume and extract key information.

Resume:
{resume}

Think step-by-step:
1. Identify all technical skills (programming languages, frameworks, tools)
2. Identify soft skills and competencies
3. Determine suitable job categories based on experience
4. Assess experience level from work history and achievements
5. Provide reasoning for your analysis

Respond in this exact JSON format (no markdown):
{{
  "technicalSkills": ["skill1", "skill2"],
  "softSkills": ["skill1", "skill2"],
  "jobCategories": ["category1", "category2"],
  "experienceLevel": "entry|mid|senior|lead",
  "reasoning": "Your reasoning here"
}}
`);

    try {
      const chain = prompt.pipe(this.model);
      const result = await chain.invoke({ resume: resumeText.slice(0, 4000) });
      
      const parsed = this.extractJSON(result.content);
      if (parsed) {
        return {
          technicalSkills: parsed.technicalSkills || [],
          softSkills: parsed.softSkills || [],
          jobCategories: parsed.jobCategories || [],
          experienceLevel: parsed.experienceLevel || 'mid',
          reasoning: parsed.reasoning || 'Analysis complete',
        };
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('❌ Resume analysis error:', error.message);
      return {
        technicalSkills: [],
        softSkills: [],
        jobCategories: [],
        experienceLevel: 'mid',
        reasoning: 'Analysis failed: ' + error.message,
      };
    }
  }

  /**
   * Agent task: Expand search terms using reasoning
   */
  async expandSearchTerms(skills, jobCategories) {
    if (!this.enabled || (!skills.length && !jobCategories.length)) {
      return {
        expandedTerms: [...skills, ...jobCategories],
        relatedRoles: [],
        reasoning: 'Agent disabled or no terms to expand',
      };
    }

    const prompt = PromptTemplate.fromTemplate(`
You are a job search strategist. Given a candidate's skills and desired job categories, expand these into comprehensive search terms.

Skills: {skills}
Job Categories: {categories}

Think strategically:
1. What are synonyms and related terms for these skills?
2. What job titles would use these skills?
3. What broader categories should we include?
4. What related technologies often appear together?

Goal: Maximize relevant job matches without losing precision.

Respond in this exact JSON format (no markdown):
{{
  "expandedTerms": ["term1", "term2"],
  "relatedRoles": ["role1", "role2"],
  "reasoning": "Your reasoning here"
}}
`);

    try {
      const chain = prompt.pipe(this.model);
      const result = await chain.invoke({
        skills: skills.join(', '),
        categories: jobCategories.join(', '),
      });

      const parsed = this.extractJSON(result.content);
      if (parsed) {
        return {
          expandedTerms: parsed.expandedTerms || [...skills, ...jobCategories],
          relatedRoles: parsed.relatedRoles || [],
          reasoning: parsed.reasoning || 'Expansion complete',
        };
      }
      throw new Error('No JSON found in response');
    } catch (error) {
      console.error('❌ Search expansion error:', error.message);
      return {
        expandedTerms: [...skills, ...jobCategories],
        relatedRoles: [],
        reasoning: 'Expansion failed: ' + error.message,
      };
    }
  }

  /**
   * Agent task: Score and rank jobs based on candidate profile
   */
  async rankJobs(jobs, candidateProfile) {
    if (!this.enabled || jobs.length === 0) {
      return {
        jobs: jobs.map((job) => ({ ...job, matchScore: 50, matchReasons: [], concerns: [] })),
        reasoning: 'Agent disabled or no jobs to rank',
      };
    }

    const { technicalSkills, jobCategories, experienceLevel } = candidateProfile;

    // Take top 10 jobs to analyze (to avoid token limits)
    const jobSummaries = jobs.slice(0, 10).map((job, idx) => ({
      id: idx.toString(),
      title: job.title,
      company: job.company_name,
      description: job.description?.slice(0, 300) || '',
      tags: job.tags || [],
    }));

    const prompt = PromptTemplate.fromTemplate(`
You are a career matching expert. Rank these jobs for a candidate.

Candidate Profile:
- Technical Skills: {skills}
- Target Roles: {categories}
- Experience Level: {level}

Jobs to Rank:
{jobs}

For each job, provide a score (0-100) and match reasons.

Respond in this exact JSON format (no markdown):
{{
  "rankedJobs": [
    {{"jobId": "0", "score": 85, "matchReasons": ["reason1", "reason2"], "concerns": ["concern1"]}},
    {{"jobId": "1", "score": 70, "matchReasons": ["reason1"], "concerns": []}}
  ],
  "reasoning": "Your overall reasoning here"
}}
`);

    try {
      const chain = prompt.pipe(this.model);
      const result = await chain.invoke({
        skills: technicalSkills.join(', '),
        categories: jobCategories.join(', '),
        level: experienceLevel,
        jobs: JSON.stringify(jobSummaries, null, 2),
      });

      const parsed = this.extractJSON(result.content);
      if (parsed && parsed.rankedJobs) {
        // Map scores back to original jobs
        const rankedJobs = parsed.rankedJobs.map((ranking) => {
          const originalJob = jobs[parseInt(ranking.jobId)];
          return {
            ...originalJob,
            matchScore: ranking.score,
            matchReasons: ranking.matchReasons || [],
            concerns: ranking.concerns || [],
          };
        });

        return {
          jobs: rankedJobs.sort((a, b) => b.matchScore - a.matchScore),
          reasoning: parsed.reasoning || 'Ranking complete',
        };
      }
      throw new Error('No valid ranking found in response');
    } catch (error) {
      console.error('❌ Job ranking error:', error.message);
      return {
        jobs: jobs.map((job) => ({ ...job, matchScore: 50, matchReasons: [], concerns: [] })),
        reasoning: 'Ranking failed: ' + error.message,
      };
    }
  }

  /**
   * Agent workflow: End-to-end job matching
   */
  async matchJobsForCandidate(resumeText, availableJobs) {
    console.log('🤖 Agent: Starting job matching workflow...');

    // Step 1: Analyze resume
    console.log('📄 Agent: Analyzing resume...');
    const resumeAnalysis = await this.analyzeResume(resumeText);
    console.log('✅ Extracted:', resumeAnalysis.technicalSkills.length, 'skills');

    // Step 2: Expand search terms
    console.log('🔍 Agent: Expanding search terms...');
    const expansion = await this.expandSearchTerms(
      resumeAnalysis.technicalSkills,
      resumeAnalysis.jobCategories
    );
    console.log('✅ Generated', expansion.expandedTerms.length, 'search terms');

    // Step 3: Filter jobs using expanded terms
    const expandedTermsLower = expansion.expandedTerms.map((t) => t.toLowerCase());
    const filteredJobs = availableJobs.filter((job) => {
      const searchText = `${job.title} ${job.description} ${job.category} ${(job.tags || []).join(' ')}`.toLowerCase();
      return expandedTermsLower.some((term) => searchText.includes(term.toLowerCase()));
    });
    console.log('✅ Filtered to', filteredJobs.length, 'relevant jobs');

    // Step 4: Rank jobs
    if (filteredJobs.length > 0) {
      console.log('⭐ Agent: Ranking jobs by match quality...');
      const ranking = await this.rankJobs(filteredJobs, resumeAnalysis);
      console.log('✅ Completed ranking');

      return {
        candidateProfile: resumeAnalysis,
        searchExpansion: expansion,
        jobs: ranking.jobs,
        totalMatches: ranking.jobs.length,
        agentReasoning: {
          resumeAnalysis: resumeAnalysis.reasoning,
          searchExpansion: expansion.reasoning,
          ranking: ranking.reasoning,
        },
      };
    }

    return {
      candidateProfile: resumeAnalysis,
      searchExpansion: expansion,
      jobs: [],
      totalMatches: 0,
      agentReasoning: {
        resumeAnalysis: resumeAnalysis.reasoning,
        searchExpansion: expansion.reasoning,
        ranking: 'No jobs to rank',
      },
    };
  }
}

module.exports = new JobMatchingAgent();
