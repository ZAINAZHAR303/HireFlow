const test = require('node:test');
const assert = require('node:assert');
const { computeAtsScore } = require('../src/utils/atsScore');

const jd =
  'We are hiring a Senior React Developer. Required: strong TypeScript, React, Node.js and AWS. ' +
  'Experience with GraphQL and Docker is a plus. Must have 5+ years building web applications.';

test('identifies matched and missing keywords', () => {
  const resume =
    'John Doe\njohn@example.com | +1 555 123 4567\nExperience\n' +
    'Built web apps with React and JavaScript. Used Node.js and REST APIs daily.\nEducation\nBS Computer Science.';
  const r = computeAtsScore(resume, jd);
  assert.ok(r.matchedKeywords.includes('react'));
  assert.ok(r.matchedKeywords.includes('node.js'));
  assert.ok(r.missingKeywords.includes('typescript'));
  assert.ok(r.missingKeywords.includes('aws'));
});

test('single-letter keyword "r" does not false-match inside words', () => {
  // "r" (the language) must not match the "r" in "React"/"Experience".
  const resume = 'Experience building React interfaces. No statistics background.';
  const r = computeAtsScore(resume, jd);
  assert.ok(!r.matchedKeywords.includes('r'), 'bare "r" should not match');
});

test('required-missing keywords are surfaced and penalize the score', () => {
  const weak = 'Email: a@b.com\nPhone 5551234567\nExperience\nI do general office work.\nEducation\nHigh school.';
  const strong =
    'a@b.com 5551234567\nExperience\nSenior engineer: TypeScript, React, Node.js, AWS, GraphQL, Docker across web apps.\nEducation\nBS.';
  const rWeak = computeAtsScore(weak, jd);
  const rStrong = computeAtsScore(strong, jd);
  assert.ok(rStrong.atsScore > rWeak.atsScore);
  assert.ok(rWeak.requiredMissing.length > 0);
  assert.ok(Array.isArray(rWeak.suggestions) && rWeak.suggestions.length > 0);
});

test('detects seniority from the job description', () => {
  const r = computeAtsScore('x'.repeat(500), jd);
  assert.strictEqual(r.seniority, 'Senior');
});

test('score is bounded 0..100', () => {
  const r = computeAtsScore('nothing relevant here', jd);
  assert.ok(r.atsScore >= 0 && r.atsScore <= 100);
});
