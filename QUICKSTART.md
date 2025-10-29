# 🚀 Quick Start Guide - Enhanced Hireflow

## Get Your FREE Gemini API Key (2 minutes)

1. Visit: https://makersuite.google.com/app/apikey
2. Sign in with Google
3. Click "Create API Key"
4. Copy the key
5. Add to `backend/.env`:
   ```
   GEMINI_API_KEY=paste_your_key_here
   ```

## Run the App

### Terminal 1 - Backend
```powershell
cd "e:\Github Repos\hireflow\backend"
npm run dev
```

### Terminal 2 - Frontend
```powershell
cd "e:\Github Repos\hireflow\frontend"
npm run dev
```

## Try It Out

1. Go to http://localhost:3000
2. Sign up (just name, email, password)
3. Click "Find Jobs" button
4. Upload resume OR enter skills like: `React, TypeScript, Full Stack Developer`
5. Watch AI extract skills and find matching jobs!

## What Changed?

### ✅ Better UX
- Separate login/signup from job search
- Clean modal for resume upload
- "Find Jobs" button workflow

### 🤖 AI-Powered Matching
- Gemini extracts skills from your resume
- Expands search terms (e.g., "React JS" → "React, JavaScript, Frontend, Web Development")
- Finds more relevant jobs

### Example:
- **Before**: "React JS, Next JS" → 0 jobs
- **After**: AI expands terms → 50+ relevant jobs!

---

**Note**: App works without Gemini API key, but job matching won't be as accurate.
