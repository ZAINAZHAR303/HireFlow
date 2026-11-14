import test from 'node:test';
import assert from 'node:assert';
import { scoreJob } from '../lib/jobScoring.js';

const profile = { coreSkills: ['React', 'TypeScript', 'Node.js', 'AWS'], expansionTerms: ['frontend development', 'javascript'] };

test('relevant job scores high with matched skills', () => {
  const job = { title: 'Senior React Engineer', category: 'Software Development', tags: ['react', 'aws'], description: 'React and TypeScript. React again.' };
  const r = scoreJob(job, profile);
  assert.ok(r.matchScore >= 50, `expected >=50, got ${r.matchScore}`);
  assert.ok(r.matchedSkills.includes('react'));
  assert.ok(Array.isArray(r.matchReasons) && r.matchReasons.length > 0);
});

test('irrelevant job scores zero', () => {
  const job = { title: 'Marketing Manager', category: 'Marketing', tags: ['seo'], description: 'Run campaigns.' };
  assert.strictEqual(scoreJob(job, profile).matchScore, 0);
});

test('empty profile returns null score', () => {
  assert.strictEqual(scoreJob({ title: 'React Dev' }, { coreSkills: [], expansionTerms: [] }).matchScore, null);
});

test('title matches beat description-only matches', () => {
  const a = scoreJob({ title: 'React Developer', tags: [], description: '' }, { coreSkills: ['React'], expansionTerms: [] });
  const b = scoreJob({ title: 'Developer', tags: [], description: 'react react experience' }, { coreSkills: ['React'], expansionTerms: [] });
  assert.ok(a.matchScore > b.matchScore);
});

test('synonyms match (k8s ≈ kubernetes, JS ≈ javascript)', () => {
  const job = { title: 'Platform Engineer', category: 'DevOps', tags: ['kubernetes'], description: 'JavaScript tooling. JavaScript everywhere.' };
  const r = scoreJob(job, { coreSkills: ['k8s', 'JS'], expansionTerms: [] });
  assert.ok(r.matchedSkills.includes('k8s'));
  assert.ok(r.matchedSkills.includes('js'));
  assert.ok(r.matchScore >= 50);
});

test('score never exceeds 100', () => {
  const job = { title: 'React TypeScript Node.js AWS', category: 'Software Development', tags: ['react', 'typescript', 'node.js', 'aws'], description: 'react typescript node.js aws react typescript node.js aws' };
  assert.ok(scoreJob(job, profile).matchScore <= 100);
});
