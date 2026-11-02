const { z } = require('zod');

/**
 * Express middleware factory that validates `req.body` against a Zod schema.
 * On success, replaces `req.body` with the parsed (and coerced) value so
 * downstream handlers get normalized data. On failure, responds 400 with a
 * concise list of field errors.
 */
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body || {});
    if (!result.success) {
      const errors = result.error.issues.map((i) => ({
        field: i.path.join('.') || '(body)',
        message: i.message,
      }));
      return res.status(400).json({ error: 'Validation failed', details: errors });
    }
    req.body = result.data;
    next();
  };
}

// Accepts an array of strings, or a comma-separated string, and normalizes to
// a trimmed, de-duplicated array of non-empty strings.
const stringListSchema = z
  .union([z.array(z.string()), z.string()])
  .optional()
  .transform((val) => {
    if (val == null) return undefined;
    const arr = Array.isArray(val) ? val : val.split(',');
    const cleaned = arr.map((s) => String(s).trim()).filter(Boolean);
    return Array.from(new Set(cleaned));
  });

const emailSchema = z
  .string({ required_error: 'email is required' })
  .trim()
  .toLowerCase()
  .email('a valid email is required');

const signupSchema = z.object({
  name: z.string({ required_error: 'name is required' }).trim().min(1, 'name is required').max(120),
  email: emailSchema,
  password: z
    .string({ required_error: 'password is required' })
    .min(8, 'password must be at least 8 characters')
    .max(200),
  phone: z.string().trim().max(40).optional(),
  linkedin: z.string().trim().max(300).optional(),
  github: z.string().trim().max(300).optional(),
  location: z.string().trim().max(200).optional(),
  skills: stringListSchema,
  preferredJobTypes: stringListSchema,
  preferredLocations: stringListSchema,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string({ required_error: 'password is required' }).min(1, 'password is required'),
});

const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().max(40).optional(),
  linkedin: z.string().trim().max(300).optional(),
  github: z.string().trim().max(300).optional(),
  location: z.string().trim().max(200).optional(),
  skills: stringListSchema,
  preferredJobTypes: stringListSchema,
  preferredLocations: stringListSchema,
  experienceLevel: z.string().trim().max(40).optional(),
});

const atsScoreSchema = z.object({
  jobDescription: z.string({ required_error: 'jobDescription is required' }).trim().min(30, 'jobDescription is too short'),
  jobTitle: z.string().trim().max(200).optional(),
  resumeText: z.string().trim().optional(),
});

module.exports = {
  validateBody,
  signupSchema,
  loginSchema,
  updateProfileSchema,
  atsScoreSchema,
};
