"""
Simplified LangChain Job Matching Agent
Uses Groq API for fast skill expansion
"""
from typing import List, Dict, Any
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field
import re


# Pydantic model for skill expansion
class SkillExpansion(BaseModel):
    """Structured output for skill expansion"""
    job_categories: List[str] = Field(description="Broad job categories like 'Full Stack Developer', 'Frontend Engineer'")
    search_keywords: List[str] = Field(description="Relevant search keywords for job matching")
    related_technologies: List[str] = Field(description="Related technologies and frameworks")


class JobMatchingGraph:
    """
    Simplified LangChain agent - uses Groq for fast inference
    """
    
    def __init__(self, api_key: str):
        self.api_key = api_key
        self.llm = None
        
        if api_key:
            self.llm = ChatGroq(
                model="llama-3.3-70b-versatile",  # Fast and accurate
                groq_api_key=api_key,
                temperature=0.3,
                max_tokens=500
            )
        else:
            print("⚠️ Warning: No GROQ_API_KEY provided, using fallback skill expansion")
    
    def is_initialized(self) -> bool:
        """Check if the agent is properly initialized"""
        return self.llm is not None
    
    def extract_skills_from_resume(self, resume_text: str) -> List[str]:
        """Simple regex-based skill extraction from resume"""
        if not resume_text:
            return []
        
        # Common technical skills patterns
        skills = []
        text_lower = resume_text.lower()
        
        # Programming languages
        languages = ['python', 'javascript', 'java', 'typescript', 'react', 'node.js', 'nodejs', 
                    'angular', 'vue', 'html', 'css', 'c++', 'c#', 'php', 'ruby', 'go', 'rust',
                    'swift', 'kotlin', 'sql', 'nosql', 'mongodb', 'postgresql', 'mysql']
        
        # Frameworks and tools
        frameworks = ['express', 'fastapi', 'django', 'flask', 'spring', 'laravel', 'rails',
                     'next.js', 'nextjs', 'vue.js', 'svelte', 'tailwind', 'bootstrap',
                     'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'git', 'ci/cd']
        
        all_skills = languages + frameworks
        
        for skill in all_skills:
            if skill in text_lower:
                # Capitalize properly
                if skill == 'node.js' or skill == 'nodejs':
                    skills.append('Node.js')
                elif skill == 'next.js' or skill == 'nextjs':
                    skills.append('Next.js')
                elif skill == 'vue.js':
                    skills.append('Vue.js')
                else:
                    skills.append(skill.capitalize())
        
        return list(set(skills))  # Remove duplicates
    
    async def expand_skills(self, user_skills: List[str], resume_skills: List[str] = None) -> Dict[str, Any]:
        """
        Expand user-provided skills + resume skills into job categories
        This is the ONLY Gemini API call we make
        """
        # Combine user skills and resume skills
        all_skills = list(set(user_skills + (resume_skills or [])))
        
        if not all_skills:
            return {
                "job_categories": ["General"],
                "search_keywords": ["software", "developer"],
                "related_technologies": [],
                "original_skills": []
            }
        
        if not self.is_initialized():
            # Fallback without AI
            return {
                "job_categories": self._simple_categorize(all_skills),
                "search_keywords": all_skills,
                "related_technologies": [],
                "original_skills": all_skills
            }
        
        print(f"🤖 Expanding {len(all_skills)} skills: {', '.join(all_skills[:5])}...")
        
        parser = PydanticOutputParser(pydantic_object=SkillExpansion)
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", "You are a job category expert. Keep responses concise."),
            ("user", """Given these skills, identify job categories and keywords.

Skills: {skills}

{format_instructions}

Be concise. Focus on real job titles and search terms.
""")
        ])
        
        try:
            chain = prompt | self.llm | parser
            result = await chain.ainvoke({
                "skills": ", ".join(all_skills),
                "format_instructions": parser.get_format_instructions()
            })
            
            print(f"✅ Expanded to {len(result.job_categories)} categories")
            
            return {
                "job_categories": result.job_categories,
                "search_keywords": result.search_keywords + all_skills,  # Include original skills
                "related_technologies": result.related_technologies,
                "original_skills": all_skills
            }
            
        except Exception as e:
            print(f"❌ Skill expansion error: {e}")
            # Fallback to simple expansion
            return {
                "job_categories": self._simple_categorize(all_skills),
                "search_keywords": all_skills,
                "related_technologies": [],
                "original_skills": all_skills
            }
    
    def _simple_categorize(self, skills: List[str]) -> List[str]:
        """Simple rule-based categorization as fallback"""
        skills_lower = [s.lower() for s in skills]
        categories = []
        
        frontend = ['react', 'vue', 'angular', 'html', 'css', 'javascript', 'typescript', 'next.js']
        backend = ['node.js', 'python', 'django', 'fastapi', 'express', 'java', 'spring']
        fullstack = ['full stack', 'fullstack', 'mern', 'mean']
        
        if any(s in skills_lower for s in frontend):
            categories.append('Frontend Developer')
        if any(s in skills_lower for s in backend):
            categories.append('Backend Developer')
        if any(s in skills_lower for s in fullstack) or (
            any(s in skills_lower for s in frontend) and any(s in skills_lower for s in backend)
        ):
            categories.append('Full Stack Developer')
        
        return categories or ['Software Developer']
