const test = require('node:test');
const assert = require('node:assert');
const {
  normalizeRemotive,
  normalizeArbeitnow,
  normalizeRemoteOk,
  dedupe,
  enabledSources,
} = require('../src/services/jobSources');

const COMMON_KEYS = [
  'id',
  'title',
  'company_name',
  'category',
  'tags',
  'job_type',
  'candidate_required_location',
  'url',
  'description',
  'publication_date',
  'source',
];

function assertShape(job) {
  for (const k of COMMON_KEYS) assert.ok(k in job, `missing key ${k}`);
  assert.ok(Array.isArray(job.tags), 'tags must be an array');
}

test('normalizeRemotive maps to common shape', () => {
  const out = normalizeRemotive({
    jobs: [
      {
        id: 1,
        title: 'React Dev',
        company_name: 'Acme',
        category: 'Software Development',
        tags: ['react'],
        job_type: 'full_time',
        candidate_required_location: 'Worldwide',
        url: 'https://r/1',
        description: 'd',
        publication_date: '2026-01-01',
      },
    ],
  });
  assert.strictEqual(out.length, 1);
  assertShape(out[0]);
  assert.strictEqual(out[0].source, 'remotive');
  assert.strictEqual(out[0].id, 'remotive_1');
});

test('normalizeArbeitnow maps job_types and remote flag', () => {
  const out = normalizeArbeitnow({
    data: [
      {
        slug: 'abc',
        title: 'Backend Engineer',
        company_name: 'Beta',
        job_types: ['full-time'],
        tags: ['node'],
        location: 'Berlin',
        remote: true,
        url: 'https://a/abc',
        description: 'd',
        created_at: 1762000000,
      },
    ],
  });
  assertShape(out[0]);
  assert.strictEqual(out[0].source, 'arbeitnow');
  assert.strictEqual(out[0].job_type, 'full-time');
  assert.ok(out[0].publication_date, 'created_at should convert to a date');
});

test('normalizeRemoteOk skips the leading metadata element', () => {
  const out = normalizeRemoteOk([
    { legal: 'notice' },
    { id: 99, position: 'DevOps', company: 'Gamma', tags: ['aws'], url: 'https://ro/99', description: 'd', date: '2026-02-02' },
  ]);
  assert.strictEqual(out.length, 1);
  assertShape(out[0]);
  assert.strictEqual(out[0].title, 'DevOps');
  assert.strictEqual(out[0].source, 'remoteok');
});

test('dedupe removes same company+title across sources', () => {
  const jobs = [
    { company_name: 'Acme', title: 'React Dev', source: 'remotive' },
    { company_name: 'acme', title: 'react dev', source: 'remoteok' }, // case-insensitive dup
    { company_name: 'Beta', title: 'Backend', source: 'arbeitnow' },
  ];
  assert.strictEqual(dedupe(jobs).length, 2);
});

test('enabledSources honors JOB_SOURCES env and ignores unknown names', () => {
  const prev = process.env.JOB_SOURCES;
  process.env.JOB_SOURCES = 'remotive, bogus ,remoteok';
  assert.deepStrictEqual(enabledSources(), ['remotive', 'remoteok']);
  if (prev === undefined) delete process.env.JOB_SOURCES;
  else process.env.JOB_SOURCES = prev;
});
