require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const { validateEnv, getCorsOrigins, isProd } = require('./config/env');

// Fail fast if required secrets are missing or insecure.
validateEnv();

const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resumes');
const jobsRoutes = require('./routes/jobs');
const resumeGeneratorRoutes = require('./routes/resumeGenerator');
const applicationsRoutes = require('./routes/applications');
const interviewPrepRoutes = require('./routes/interviewPrep');
const outreachRoutes = require('./routes/outreach');

const app = express();

// Trust the reverse proxy (needed for correct client IPs behind Vercel/NGINX,
// which rate limiting relies on).
app.set('trust proxy', 1);

// Secure HTTP headers.
app.use(helmet());

// CORS: use an explicit allowlist in production; reflect any origin in dev.
const allowedOrigins = getCorsOrigins();
app.use(
  cors({
    origin(origin, callback) {
      // Non-browser clients (curl, server-to-server) send no Origin.
      if (!origin) return callback(null, true);
      if (allowedOrigins.length === 0 && !isProd) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json({ limit: '1mb' }));

// Global rate limiter: protects every endpoint from abuse.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(globalLimiter);

const PORT = process.env.PORT || 4001;

async function start() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  app.use('/auth', authRoutes);
  app.use('/resumes', resumeRoutes);
  app.use('/jobs', jobsRoutes);
  app.use('/resume-generator', resumeGeneratorRoutes);
  app.use('/applications', applicationsRoutes);
  app.use('/interview-prep', interviewPrepRoutes);
  app.use('/outreach', outreachRoutes);

  app.get('/', (req, res) => res.json({ ok: true }));
  app.get('/health', (req, res) =>
    res.json({ status: 'healthy', db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' })
  );

  app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
