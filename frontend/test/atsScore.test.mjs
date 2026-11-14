import test from 'node:test';
import assert from 'node:assert';
import { computeAtsScore } from '../lib/atsScore.js';

const jd = 'Senior React Developer. Required: strong TypeScript, React, Node.js and AWS. GraphQL and Docker a plus. 5+ years web apps.';

test('identifies matched and missing keywords', () => {
  const resume = 'john@x.com +1 555 123 4567\nExperience\nBuilt web apps with React and JavaScript. Used Node.js and REST.\nEducation\nBS CS.';
  const r = computeAtsScore(resume, jd);
  assert.ok(r.matchedKeywords.includes('react'));
  assert.ok(r.missingKeywords.includes('typescript'));
  assert.ok(r.missingKeywords.includes('aws'));
});

test('single-letter "r" does not false-match inside words', () => {
  const r = computeAtsScore('Experience building React interfaces.', jd);
  assert.ok(!r.matchedKeywords.includes('r'));
});

test('score bounded 0..100', () => {
  const r = computeAtsScore('nothing relevant', jd);
  assert.ok(r.atsScore >= 0 && r.atsScore <= 100);
});

test('detects seniority', () => {
  assert.strictEqual(computeAtsScore('x'.repeat(500), jd).seniority, 'Senior');
});
