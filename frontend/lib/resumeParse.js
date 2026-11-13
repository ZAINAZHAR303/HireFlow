/**
 * Client-side résumé parsing: pull skills + contact links out of the extracted
 * résumé text. Deterministic (no AI key needed); runs in the browser.
 */

// Known skills, with display casing. Matched case-insensitively, whole-token.
const SKILLS = [
  'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Golang', 'Rust', 'Ruby', 'PHP',
  'Swift', 'Kotlin', 'Scala', 'R', 'MATLAB', 'Perl', 'Dart', 'SQL', 'Bash', 'Shell',
  'React', 'Next.js', 'Vue', 'Angular', 'Svelte', 'Redux', 'Tailwind', 'Sass', 'Webpack', 'Vite',
  'HTML', 'CSS', 'jQuery', 'Bootstrap', 'Material-UI', 'React Native', 'Flutter',
  'Node.js', 'Express', 'NestJS', 'Django', 'Flask', 'FastAPI', 'Spring', 'Spring Boot',
  'Rails', 'Laravel', '.NET', 'ASP.NET', 'GraphQL', 'REST', 'gRPC', 'Microservices', 'WebSocket',
  'Machine Learning', 'Deep Learning', 'TensorFlow', 'PyTorch', 'Pandas', 'NumPy', 'scikit-learn',
  'NLP', 'Computer Vision', 'Data Analysis', 'Data Science', 'ETL', 'Spark', 'Hadoop', 'Kafka',
  'Tableau', 'Power BI', 'Looker', 'OpenAI', 'LangChain', 'Hugging Face',
  'MongoDB', 'PostgreSQL', 'Postgres', 'MySQL', 'Redis', 'Elasticsearch', 'DynamoDB', 'Cassandra',
  'SQLite', 'Oracle', 'Firebase', 'Supabase', 'Prisma',
  'AWS', 'Azure', 'GCP', 'Google Cloud', 'Docker', 'Kubernetes', 'Terraform', 'Ansible', 'Jenkins',
  'CI/CD', 'GitHub Actions', 'GitLab', 'CircleCI', 'Serverless', 'Lambda', 'Nginx', 'Linux',
  'Agile', 'Scrum', 'Kanban', 'Jira', 'Git', 'TDD', 'Unit Testing', 'Jest', 'Cypress', 'Playwright',
  'Figma', 'API', 'OAuth', 'JWT', 'Stripe', 'WordPress',
];

function hasToken(text, kw) {
  const esc = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // whole-token match (so "r" / "go" don't match inside words); underscores/hyphens flattened upstream
  return new RegExp(`(?<![a-z0-9])${esc}(?![a-z0-9])`, 'i').test(text);
}

/**
 * @param {string} text  extracted résumé text
 * @returns {{ skills: string[], github: string, linkedin: string, phone: string, email: string }}
 */
export function parseResumeProfile(text) {
  const t = String(text || '').replace(/[_]/g, ' ');
  const skills = [];
  const seen = new Set();
  for (const s of SKILLS) {
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    if (hasToken(t, s)) {
      skills.push(s);
      seen.add(key);
    }
  }

  const gh = (t.match(/github\.com\/[A-Za-z0-9_.-]+/i) || [])[0];
  const li = (t.match(/linkedin\.com\/in\/[A-Za-z0-9%._-]+/i) || [])[0];
  const email = (t.match(/[\w.+-]+@[\w-]+\.[\w.-]+/) || [])[0] || '';
  const phoneRaw = (t.match(/(\+?\d[\d\s().-]{8,}\d)/) || [])[0] || '';

  return {
    skills,
    github: gh ? `https://${gh.replace(/\/+$/, '')}` : '',
    linkedin: li ? `https://${li.replace(/\/+$/, '')}` : '',
    email,
    phone: phoneRaw.trim(),
  };
}
