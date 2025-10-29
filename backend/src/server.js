require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resumes');
const jobsRoutes = require('./routes/jobs');
const resumeGeneratorRoutes = require('./routes/resumeGenerator');
const applicationsRoutes = require('./routes/applications');
const interviewPrepRoutes = require('./routes/interviewPrep');

const app = express();

// CORS configuration - Allow requests from frontend
app.use(cors({
  origin: '*', // Allow all origins for now (will update with specific Vercel URL after deployment)
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

const PORT = process.env.PORT || 4001;

async function start() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI not set in env');
    process.exit(1);
  }

  await mongoose.connect(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('Connected to MongoDB');

  app.use('/auth', authRoutes);
  app.use('/resumes', resumeRoutes);
  app.use('/jobs', jobsRoutes);
  app.use('/resume-generator', resumeGeneratorRoutes);
  app.use('/applications', applicationsRoutes);
  app.use('/interview-prep', interviewPrepRoutes);

  app.get('/', (req, res) => res.json({ok: true}));

  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

start().catch(err => {
  console.error('Failed to start server', err);
  process.exit(1);
});
