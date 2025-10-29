# HireFlow AI Backend

Python FastAPI backend with LangChain and LangGraph for intelligent job matching.

## Features

- **LangGraph Workflow**: Multi-step agentic AI system
  - Resume Analysis Node
  - Search Expansion Node  
  - Job Filtering Node
  - Job Ranking Node

- **LangChain Integration**: Structured outputs with Gemini Pro
- **FastAPI**: High-performance async API
- **Pydantic Validation**: Type-safe request/response handling

## Setup

1. **Create virtual environment**:
   ```powershell
   python -m venv venv
   .\venv\Scripts\Activate.ps1
   ```

2. **Install dependencies**:
   ```powershell
   pip install -r requirements.txt
   ```

3. **Configure environment**:
   ```powershell
   Copy-Item .env.example .env
   # Edit .env and add your GEMINI_API_KEY
   ```

4. **Run the server**:
   ```powershell
   python main.py
   ```

   Or with uvicorn:
   ```powershell
   uvicorn main:app --reload --port 5000
   ```

## API Endpoints

### Health Check
- `GET /` - Basic health check
- `GET /health` - Detailed status

### AI Endpoints
- `POST /analyze-resume` - Analyze resume with LangGraph agent
- `POST /expand-search` - Expand search terms strategically
- `POST /rank-jobs` - Rank jobs by match quality
- `POST /match-jobs` - Complete end-to-end matching workflow

## Architecture

```
ai-backend/
├── main.py                    # FastAPI application
├── agents/
│   └── job_matching_graph.py # LangGraph workflow
├── requirements.txt
└── .env
```

## Integration with Node.js Backend

The Node.js backend (`localhost:4000`) can call this Python backend (`localhost:5000`) for AI-powered features:

```javascript
// Node.js route example
const aiBackend = axios.create({ baseURL: 'http://localhost:5000' });

router.post('/upload', authMiddleware, upload.single('resume'), async (req, res) => {
  // ... upload logic ...
  
  // Call Python AI backend
  const aiResponse = await aiBackend.post('/analyze-resume', {
    resume_text: extractedText
  });
  
  const { technical_skills, soft_skills, job_categories } = aiResponse.data;
  // ... use AI results ...
});
```
