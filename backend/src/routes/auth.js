const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'changeme', { expiresIn: '7d' });
}

router.post('/signup', async (req, res) => {
  const { name, email, password, phone, linkedin, github, location, skills, preferredJobTypes, preferredLocations } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'name, email, password required' });
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'User already exists' });
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const skillsArr = Array.isArray(skills) ? skills : (skills || '').split(',').map(s => s.trim()).filter(Boolean);
    const preferredArr = Array.isArray(preferredJobTypes) ? preferredJobTypes : (preferredJobTypes || '').split(',').map(s => s.trim()).filter(Boolean);
    const locationsArr = Array.isArray(preferredLocations) ? preferredLocations : (preferredLocations || '').split(',').map(s => s.trim()).filter(Boolean);
    const user = new User({ 
      name, 
      email, 
      passwordHash, 
      phone: phone || '', 
      linkedin: linkedin || '',
      github: github || '',
      location: location || '', 
      skills: skillsArr, 
      preferredJobTypes: preferredArr,
      preferredLocations: locationsArr
    });
    await user.save();
    const token = signToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, linkedin: user.linkedin, github: user.github, location: user.location, skills: user.skills, preferredJobTypes: user.preferredJobTypes, preferredLocations: user.preferredLocations, jobCategories: user.jobCategories } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    const token = signToken(user);
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, linkedin: user.linkedin, github: user.github, location: user.location, skills: user.skills, preferredJobTypes: user.preferredJobTypes, preferredLocations: user.preferredLocations, jobCategories: user.jobCategories, resumeId: user.resumeId } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

// Update user profile (skills, preferences, phone, location, etc.)
router.post('/update-profile', authMiddleware, async (req, res) => {
  const { skills, preferredJobTypes, preferredLocations, phone, linkedin, github, location, name } = req.body;
  try {
    if (name) req.user.name = name;
    if (phone !== undefined) req.user.phone = phone;
    if (linkedin !== undefined) req.user.linkedin = linkedin;
    if (github !== undefined) req.user.github = github;
    if (location !== undefined) req.user.location = location;
    if (skills) {
      const skillsArr = Array.isArray(skills) ? skills : skills.split(',').map(s => s.trim()).filter(Boolean);
      req.user.skills = skillsArr;
    }
    if (preferredJobTypes) {
      const preferredArr = Array.isArray(preferredJobTypes) ? preferredJobTypes : preferredJobTypes.split(',').map(s => s.trim()).filter(Boolean);
      req.user.preferredJobTypes = preferredArr;
    }
    if (preferredLocations) {
      const locationsArr = Array.isArray(preferredLocations) ? preferredLocations : preferredLocations.split(',').map(s => s.trim()).filter(Boolean);
      req.user.preferredLocations = locationsArr;
    }
    await req.user.save();
    res.json({ 
      user: { 
        id: req.user._id, 
        name: req.user.name, 
        email: req.user.email,
        phone: req.user.phone,
        linkedin: req.user.linkedin,
        github: req.user.github,
        location: req.user.location,
        skills: req.user.skills, 
        preferredJobTypes: req.user.preferredJobTypes,
        preferredLocations: req.user.preferredLocations,
        jobCategories: req.user.jobCategories,
        resumeId: req.user.resumeId
      } 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
