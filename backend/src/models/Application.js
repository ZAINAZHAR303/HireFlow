const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  jobId: {
    type: String,
    required: true
  },
  jobTitle: {
    type: String,
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  applyUrl: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'success', 'failed', 'timeout'],
    default: 'pending'
  },
  resumePath: {
    type: String
  },
  coverLetterPath: {
    type: String
  },
  coverLetter: {
    type: String
  },
  screenshotPath: {
    type: String
  },
  errorMessage: {
    type: String
  },
  // Interview Preparation
  interviewPrep: {
    questions: [{
      question: String,
      answer: String,
      category: String // behavioral, technical, company-specific
    }],
    companyResearch: {
      summary: String,
      keyFacts: [String],
      culture: String,
      recentNews: String
    },
    preparedAt: Date
  },
  automationSteps: [{
    step: String,
    status: String,
    timestamp: Date,
    screenshot: String
  }],
  appliedAt: {
    type: Date
  },
  metadata: {
    formFields: Object,
    detectedSelectors: Object,
    automationDuration: Number
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Application', applicationSchema);
