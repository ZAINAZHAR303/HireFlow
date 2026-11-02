const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/user');
const authMiddleware = require('../middleware/authMiddleware');
const { JWT_EXPIRES_IN } = require('../config/env');
const { validateBody, signupSchema, loginSchema, updateProfileSchema } = require('../utils/validate');

const router = express.Router();

// Stricter limiter for credential endpoints to slow brute-force / enumeration.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
});

function signToken(user) {
  // JWT_SECRET is guaranteed present and strong by validateEnv() at startup.
  return jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    linkedin: user.linkedin,
    github: user.github,
    location: user.location,
    skills: user.skills,
    preferredJobTypes: user.preferredJobTypes,
    preferredLocations: user.preferredLocations,
    jobCategories: user.jobCategories,
    resumeId: user.resumeId,
  };
}

router.post('/signup', authLimiter, validateBody(signupSchema), async (req, res) => {
  const { name, email, password, phone, linkedin, github, location, skills, preferredJobTypes, preferredLocations } =
    req.body;
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: 'User already exists' });
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const user = new User({
      name,
      email,
      passwordHash,
      phone: phone || '',
      linkedin: linkedin || '',
      github: github || '',
      location: location || '',
      skills: skills || [],
      preferredJobTypes: preferredJobTypes || [],
      preferredLocations: preferredLocations || [],
    });
    await user.save();
    const token = signToken(user);
    res.status(201).json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('signup error', err);
    res.status(500).json({ error: 'server error' });
  }
});

router.post('/login', authLimiter, validateBody(loginSchema), async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: 'Invalid credentials' });
    const token = signToken(user);
    res.json({ token, user: publicUser(user) });
  } catch (err) {
    console.error('login error', err);
    res.status(500).json({ error: 'server error' });
  }
});

// Update user profile (skills, preferences, phone, location, etc.)
router.post('/update-profile', authMiddleware, validateBody(updateProfileSchema), async (req, res) => {
  const { skills, preferredJobTypes, preferredLocations, phone, linkedin, github, location, name, experienceLevel } =
    req.body;
  try {
    if (name !== undefined) req.user.name = name;
    if (phone !== undefined) req.user.phone = phone;
    if (linkedin !== undefined) req.user.linkedin = linkedin;
    if (github !== undefined) req.user.github = github;
    if (location !== undefined) req.user.location = location;
    if (experienceLevel !== undefined) req.user.experienceLevel = experienceLevel;
    if (skills !== undefined) req.user.skills = skills;
    if (preferredJobTypes !== undefined) req.user.preferredJobTypes = preferredJobTypes;
    if (preferredLocations !== undefined) req.user.preferredLocations = preferredLocations;
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  } catch (err) {
    console.error('update-profile error', err);
    res.status(500).json({ error: 'server error' });
  }
});

module.exports = router;
