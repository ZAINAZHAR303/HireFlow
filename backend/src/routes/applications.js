const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Application = require('../models/Application');
const ApplyAgent = require('../services/applyAgent');
const path = require('path');

// POST /analyze-form - Analyze application form without applying
router.post('/analyze-form', authMiddleware, async (req, res) => {
  try {
    const { applyUrl } = req.body;

    if (!applyUrl) {
      return res.status(400).json({ error: 'Application URL is required' });
    }

    console.log(`🔍 Analyzing form at: ${applyUrl}`);

    // Create temporary agent just to analyze
    const agent = new ApplyAgent();
    
    try {
      await agent.init();
      await agent.page.goto(applyUrl, { waitUntil: 'networkidle2', timeout: 30000 });
      const detectedFields = await agent.detectFormFields();
      await agent.browser.close();

      res.json({
        success: true,
        detectedFields,
        message: 'Form analyzed successfully'
      });
    } catch (error) {
      if (agent.browser) await agent.browser.close();
      throw error;
    }

  } catch (err) {
    console.error('Form analysis error:', err);
    res.status(500).json({ 
      error: 'Failed to analyze form',
      message: err.message 
    });
  }
});

// POST /apply - Automate job application
router.post('/apply', authMiddleware, async (req, res) => {
  try {
    const { jobId, jobTitle, companyName, applyUrl, userData: providedUserData, autoSubmit = false } = req.body;
    const user = req.user;

    if (!applyUrl) {
      return res.status(400).json({ error: 'Application URL is required' });
    }

    console.log(`🤖 Starting application automation for: ${jobTitle} at ${companyName}`);

    // Create application record
    const application = new Application({
      userId: user._id,
      jobId,
      jobTitle,
      companyName,
      applyUrl,
      status: 'in_progress'
    });
    await application.save();

    // Prepare user data for form filling (merge provided data with user profile)
    const userData = {
      fullName: providedUserData?.fullName || user.name || 'John Doe',
      email: providedUserData?.email || user.email,
      phone: providedUserData?.phone || user.phone || '+1234567890',
      linkedin: providedUserData?.linkedin || user.linkedin || '',
      portfolio: providedUserData?.portfolio || user.portfolio || user.github || '',
      ...providedUserData, // Include any custom fields
      resumePath: user.resumeUrl ? await downloadFile(user.resumeUrl) : null,
      coverLetterPath: null // TODO: Generate cover letter
    };

    // Create apply agent
    const agent = new ApplyAgent();

    // Run automation
    const result = await agent.apply(applyUrl, userData, { autoSubmit });

    // Update application record
    application.status = result.status;
    application.automationSteps = result.steps;
    application.metadata = {
      detectedSelectors: result.detectedFields,
      automationDuration: result.duration
    };
    
    if (result.screenshots.length > 0) {
      application.screenshotPath = result.screenshots[result.screenshots.length - 1].path;
    }
    
    if (result.error) {
      application.errorMessage = result.error;
    }
    
    if (result.status === 'success') {
      application.appliedAt = new Date();
    }

    await application.save();

    res.json({
      success: true,
      applicationId: application._id,
      status: result.status,
      steps: result.steps,
      screenshots: result.screenshots.map(s => s.step),
      duration: result.duration,
      message: result.status === 'success' 
        ? 'Application submitted successfully!' 
        : result.status === 'filled_not_submitted'
        ? 'Form filled successfully (not submitted for safety)'
        : 'Application automation completed with issues'
    });

  } catch (err) {
    console.error('Application automation error:', err);
    res.status(500).json({ 
      error: 'Failed to automate application',
      message: err.message 
    });
  }
});

// GET /applications - Get user's application history
router.get('/applications', authMiddleware, async (req, res) => {
  try {
    const applications = await Application.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ applications });
  } catch (err) {
    console.error('Error fetching applications:', err);
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
});

// GET /applications/:id - Get single application details
router.get('/applications/:id', authMiddleware, async (req, res) => {
  try {
    const application = await Application.findOne({
      _id: req.params.id,
      userId: req.user._id
    });

    if (!application) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ application });
  } catch (err) {
    console.error('Error fetching application:', err);
    res.status(500).json({ error: 'Failed to fetch application' });
  }
});

// Helper function to download file (for resume)
async function downloadFile(url) {
  // For now, return the URL directly
  // TODO: Download file from Cloudinary and save locally for upload
  return null;
}

module.exports = router;
