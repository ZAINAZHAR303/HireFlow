const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  phone: { type: String, default: '' },
  linkedin: { type: String, default: '' },
  github: { type: String, default: '' },
  location: { type: String, default: '' },
  skills: { type: [String], default: [] },
  jobCategories: { type: [String], default: [] },
  preferredJobTypes: { type: [String], default: [] }, // remote, onsite, hybrid, full-time, part-time, contract
  preferredLocations: { type: [String], default: [] }, // for onsite/hybrid jobs
  experienceLevel: { type: String, default: '' }, // entry, mid, senior
  resumeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Resume', default: null }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
