const express = require('express');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const streamifier = require('streamifier');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const Resume = require('../models/resume');
const User = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');
const axios = require('axios');

const AI_BACKEND_URL = process.env.AI_BACKEND_URL || 'http://localhost:5001';

const router = express.Router();
const upload = multer();

if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

async function extractTextFromBuffer(mimetype, buffer) {
  if (mimetype === 'application/pdf') {
    try {
      const data = await pdf(buffer);
      return data.text || '';
    } catch (err) {
      console.error('pdf parse error', err);
      return '';
    }
  }
  // docx
  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimetype === 'application/msword') {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value || '';
    } catch (err) {
      console.error('mammoth error', err);
      return '';
    }
  }
  // fallback: treat as text
  return buffer.toString('utf8');
}

router.post('/upload', authMiddleware, upload.single('resume'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const { originalname, mimetype, buffer } = req.file;
  try {
    // upload to cloudinary if configured
    let uploadedUrl = null;
    if (process.env.CLOUDINARY_CLOUD_NAME) {
      uploadedUrl = await new Promise((resolve, reject) => {
        const upload_stream = cloudinary.uploader.upload_stream({ resource_type: 'raw', folder: 'hireflow/resumes' }, (error, result) => {
          if (error) return reject(error);
          resolve(result.secure_url);
        });
        streamifier.createReadStream(buffer).pipe(upload_stream);
      });
    }

    const text = await extractTextFromBuffer(mimetype, buffer);

    const resume = new Resume({ userId: req.user._id, fileName: originalname, cloudUrl: uploadedUrl, text });
    await resume.save();
    
    // Call Python AI backend for skill expansion (lightweight)
    console.log('🤖 Calling Python AI backend for skill expansion...');
    let skillExpansion = { job_categories: [], search_keywords: [], original_skills: [] };
    
    try {
      const aiResponse = await axios.post(`${AI_BACKEND_URL}/expand-skills`, {
        user_skills: req.user.skills || [],
        resume_text: text
      }, { timeout: 10000 });
      skillExpansion = aiResponse.data;
      console.log(`✅ AI extracted ${skillExpansion.original_skills.length} skills from resume`);
    } catch (err) {
      console.error('❌ AI backend error:', err.message);
    }
    
    // Update user with extracted skills
    if (skillExpansion.original_skills?.length > 0) {
      req.user.skills = [...new Set([...req.user.skills, ...skillExpansion.original_skills])];
    }
    if (skillExpansion.job_categories?.length > 0) {
      req.user.jobCategories = skillExpansion.job_categories;
    }
    
    // attach to user
    req.user.resumeId = resume._id;
    await req.user.save();

    res.json({ 
      resumeId: resume._id, 
      cloudUrl: uploadedUrl, 
      text: text.slice(0, 1000),
      extractedSkills: skillExpansion.original_skills,
      jobCategories: skillExpansion.job_categories,
      searchKeywords: skillExpansion.search_keywords
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

router.get('/me', authMiddleware, async (req, res) => {
  const resume = await Resume.findOne({ userId: req.user._id }).sort({ uploadedAt: -1 });
  res.json({ resume });
});

module.exports = router;
