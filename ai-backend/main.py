"""
FastAPI backend for AI-powered skill expansion using LangChain
Simplified - only expands skills, no heavy resume processing
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
from dotenv import load_dotenv

from agents.job_matching_graph import JobMatchingGraph

load_dotenv()

app = FastAPI(
    title="HireFlow AI Backend",
    description="Lightweight AI system for skill expansion and job matching",
    version="2.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:4001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize the job matching agent
job_matching_graph = JobMatchingGraph(api_key=os.getenv("GROQ_API_KEY"))


# Request/Response models
class SkillExpansionRequest(BaseModel):
    user_skills: List[str]  # Skills entered by user
    resume_text: Optional[str] = None  # Optional resume for skill extraction

class SkillExpansionResponse(BaseModel):
    job_categories: List[str]
    search_keywords: List[str]
    related_technologies: List[str]
    original_skills: List[str]


@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "HireFlow AI Backend",
        "version": "2.0.0",
        "description": "Skill expansion only - lightweight and fast"
    }

@app.get("/health")
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "groq_configured": bool(os.getenv("GROQ_API_KEY")),
        "agent_initialized": job_matching_graph.is_initialized()
    }

@app.post("/expand-skills", response_model=SkillExpansionResponse)
async def expand_skills(request: SkillExpansionRequest):
    """
    Expand skills into job categories and search keywords
    
    This is the ONLY AI endpoint - it:
    1. Extracts skills from resume (regex-based, fast)
    2. Calls Gemini ONCE to expand skills into categories
    3. Returns search keywords for database filtering
    
    No heavy processing, no multiple API calls, no rate limits!
    """
    try:
        # Extract skills from resume if provided
        resume_skills = []
        if request.resume_text:
            resume_skills = job_matching_graph.extract_skills_from_resume(request.resume_text)
            print(f"📄 Extracted {len(resume_skills)} skills from resume")
        
        # Expand skills using AI (or fallback)
        result = await job_matching_graph.expand_skills(
            user_skills=request.user_skills,
            resume_skills=resume_skills
        )
        
        return SkillExpansionResponse(**result)
    
    except Exception as e:
        print(f"❌ Error: {e}")
        raise HTTPException(status_code=500, detail=f"Skill expansion failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 5001))
    uvicorn.run(app, host="0.0.0.0", port=port)
