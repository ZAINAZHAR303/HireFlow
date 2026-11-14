import test from 'node:test';
import assert from 'node:assert';
import { parseResumeProfile } from '../lib/resumeParse.js';

const sample =
  'Zain Azhar\nFaisalabad | +92 300 1234567 | zain@example.com\n' +
  'github.com/ZAINAZHAR303  linkedin.com/in/zain-azhar\n' +
  'Built apps with React, Next.js, Node.js, TypeScript and MongoDB. Deployed on AWS with Docker. Python and TensorFlow for ML. REST APIs and Tailwind.';

test('extracts skills from résumé text', () => {
  const r = parseResumeProfile(sample);
  for (const s of ['React', 'Next.js', 'Node.js', 'TypeScript', 'MongoDB', 'AWS', 'Docker', 'Python', 'TensorFlow']) {
    assert.ok(r.skills.includes(s), `expected skill ${s}`);
  }
});

test('extracts github, linkedin, email, phone', () => {
  const r = parseResumeProfile(sample);
  assert.strictEqual(r.github, 'https://github.com/ZAINAZHAR303');
  assert.ok(r.linkedin.startsWith('https://linkedin.com/in/'));
  assert.strictEqual(r.email, 'zain@example.com');
  assert.ok(r.phone.includes('300 1234567'));
});

test('no false positives on empty text', () => {
  const r = parseResumeProfile('');
  assert.deepStrictEqual(r.skills, []);
  assert.strictEqual(r.github, '');
});
