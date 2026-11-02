/**
 * Centralized environment configuration and validation.
 *
 * Fails fast at startup if a required secret is missing, so the app can never
 * silently run with an insecure default (e.g. a predictable JWT secret that
 * would let anyone forge auth tokens).
 */

const isProd = process.env.NODE_ENV === 'production';

// Variables the app cannot safely run without.
const REQUIRED = ['MONGODB_URI', 'JWT_SECRET'];

function validateEnv() {
  const missing = REQUIRED.filter((key) => !process.env[key] || !String(process.env[key]).trim());
  if (missing.length > 0) {
    console.error(
      `\n❌ Missing required environment variables: ${missing.join(', ')}\n` +
        `   Set them in backend/.env (see backend/.env.example).\n`
    );
    process.exit(1);
  }

  // A short or obviously-default JWT secret is a critical vulnerability.
  const jwtSecret = process.env.JWT_SECRET;
  if (jwtSecret === 'changeme' || jwtSecret.length < 32) {
    console.error(
      '\n❌ JWT_SECRET is weak or set to a default value.\n' +
        '   Use a random secret of at least 32 characters, e.g.:\n' +
        "   node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"\n"
    );
    process.exit(1);
  }
}

// Parse the allowed CORS origins from env. Comma-separated list, or falls back
// to FRONTEND_URL. In non-production, an empty list means "reflect any origin"
// to keep local dev frictionless.
function getCorsOrigins() {
  const raw = process.env.CORS_ORIGINS || process.env.FRONTEND_URL || '';
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

module.exports = {
  isProd,
  validateEnv,
  getCorsOrigins,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
};
