const test = require('node:test');
const assert = require('node:assert');
const { scoreJob } = require('../src/utils/jobScoring');

const profile = {
  coreSkills: ['React', 'TypeScript', 'Node.js', 'AWS'],
  expansionTerms: ['frontend development', 'javascript'],
};

test('relevant job scores high and lists matched skills', () => {
  const job = {
    title: 'Senior React Engineer',
    category: 'Software Development',
    tags: ['react', 'aws'],
    description: 'Build with React and TypeScript. React again.',
  };
  const r = scoreJob(job, profile);
  assert.ok(r.matchScore >= 50, `expected >=50, got ${r.matchScore}`);
  assert.ok(r.matchedSkills.includes('react'));
  assert.ok(Array.isArray(r.matchReasons) && r.matchReasons.length > 0);
});

test('irrelevant job scores zero with no matched skills', () => {
  const job = {
    title: 'Marketing Manager',
    category: 'Marketing',
    tags: ['seo', 'content'],
    description: 'Run marketing campaigns and brand strategy.',
  };
  const r = scoreJob(job, profile);
  assert.strictEqual(r.matchScore, 0);
  assert.deepStrictEqual(r.matchedSkills, []);
});

test('empty profile returns null score (unscored)', () => {
  const r = scoreJob({ title: 'React Dev' }, { coreSkills: [], expansionTerms: [] });
  assert.strictEqual(r.matchScore, null);
  assert.deepStrictEqual(r.matchReasons, []);
});

test('title matches outrank description-only matches', () => {
  const titleJob = { title: 'React Developer', category: '', tags: [], description: '' };
  const descJob = { title: 'Developer', category: '', tags: [], description: 'react react experience' };
  const a = scoreJob(titleJob, { coreSkills: ['React'], expansionTerms: [] });
  const b = scoreJob(descJob, { coreSkills: ['React'], expansionTerms: [] });
  assert.ok(a.matchScore > b.matchScore, `title ${a.matchScore} should beat desc ${b.matchScore}`);
});

test('score never exceeds 100', () => {
  const job = {
    title: 'React TypeScript Node.js AWS Engineer',
    category: 'Software Development',
    tags: ['react', 'typescript', 'node.js', 'aws'],
    description: 'react typescript node.js aws react typescript node.js aws',
  };
  const r = scoreJob(job, profile);
  assert.ok(r.matchScore <= 100);
});
